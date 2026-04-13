import { syncQueueDb } from '../db/syncQueueDb';
import { remindersDb } from '../db/remindersDb';
import { metaDb } from '../db/metaDb';
import { remindersApi } from '../features/reminders/api/remindersApi';
import { useSyncStore } from '../store/syncStore';
import { useReminderStore } from '../features/reminders/store/reminderStore';
import { networkMonitor } from './networkMonitor';
import { v4 as uuidv4 } from 'uuid';

let syncTimer = null;
let initialized = false;

async function runSync() {
    if (!networkMonitor.isOnline()) return;

    const { setIsSyncing, setPendingCount, setLastSyncAt, setSyncError } = useSyncStore.getState();
    const pendingOps = await syncQueueDb.getAll();

    if (pendingOps.length === 0) {
        // Still pull latest from server
        await pullFromServer();
        return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
        const operations = pendingOps.map(op => ({
            operationId: op.operationId || uuidv4(),
            type: op.type,
            payload: op.payload,
        }));

        const result = await remindersApi.sync({
            operations,
            clientTimestamp: new Date().toISOString(),
        });

        // Process results
        for (const res of result.results || []) {
            if (res.status === 'created' || res.status === 'updated' || res.status === 'conflict_resolved') {
                if (res.reminder) {
                    await remindersDb.put({ ...res.reminder, isSynced: true });
                }
            } else if (res.status === 'deleted') {
                const op = operations.find(o => o.operationId === res.operationId);
                if (op?.payload?.clientId) {
                    await remindersDb.remove(op.payload.clientId);
                }
            }
        }

        // Clear synced queue items
        for (const op of pendingOps) {
            if (op.id !== undefined) {
                await syncQueueDb.removeById(op.id);
            }
        }

        // Update server reminders in DB
        if (result.serverReminders?.length > 0) {
            await remindersDb.bulkPut(result.serverReminders.map(r => ({ ...r, isSynced: true })));
        }

        const now = result.syncedAt || new Date().toISOString();
        await metaDb.setLastSyncAt(now);
        setLastSyncAt(now);
        setPendingCount(0);

        // Refresh reminder store
        const allLocal = await remindersDb.getAll();
        useReminderStore.getState().setReminders(allLocal.filter(r => !r.isDeleted));
    } catch (err) {
        console.error('[SyncEngine] Sync failed:', err);
        setSyncError('Sync failed. Will retry when online.');
    } finally {
        setIsSyncing(false);
        const remaining = await syncQueueDb.count();
        setPendingCount(remaining);
    }
}

async function pullFromServer() {
    if (!networkMonitor.isOnline()) return;
    try {
        const lastSyncAt = await metaDb.getLastSyncAt();
        const reminders = await remindersApi.getAll(lastSyncAt ? { since: lastSyncAt } : {});
        if (reminders.length > 0) {
            await remindersDb.bulkPut(reminders.map(r => ({ ...r, isSynced: true })));
            const allLocal = await remindersDb.getAll();
            useReminderStore.getState().setReminders(allLocal.filter(r => !r.isDeleted));
        }
        const now = new Date().toISOString();
        await metaDb.setLastSyncAt(now);
        useSyncStore.getState().setLastSyncAt(now);
    } catch {
        // Silent fail for background pull
    }
}

export const syncEngine = {
    async init() {
        if (initialized) return;
        initialized = true;

        // Sync on coming online
        networkMonitor.onOnline(async () => {
            clearTimeout(syncTimer);
            syncTimer = setTimeout(() => runSync(), 1000);
        });

        // Initial pending count
        const count = await syncQueueDb.count();
        useSyncStore.getState().setPendingCount(count);

        // Sync if online on startup
        if (networkMonitor.isOnline()) {
            setTimeout(() => runSync(), 2000);
        }
    },

    async triggerSync() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => runSync(), 300);
    },

    async updatePendingCount() {
        const count = await syncQueueDb.count();
        useSyncStore.getState().setPendingCount(count);
    },
};
