import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { remindersApi } from '../api/remindersApi';
import { remindersDb } from '../../../db/remindersDb';
import { syncQueueDb } from '../../../db/syncQueueDb';
import { metaDb } from '../../../db/metaDb';
import { useSyncStore } from '../../../store/syncStore';
import { useAuthStore } from '../../auth/store/authStore';

const isDemo = () => useAuthStore.getState().isDemo;

const makeDemoReminders = () => {
    const now = Date.now();
    const r = (id, title, description, minutesFromNow, priority, isCompleted = false) => ({
        id, clientId: id, title, description,
        dueDate: new Date(now + minutesFromNow * 60000).toISOString(),
        priority, isCompleted, isDeleted: false, isSynced: false,
        version: 1,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
    });
    return [
        r('demo-1', 'Team standup', 'Daily sync with the team', 30, 'high'),
        r('demo-2', 'Review Q1 goals', 'Check progress on quarterly objectives', 120, 'medium'),
        r('demo-3', 'Buy groceries', 'Milk, bread, eggs, coffee', 180, 'low'),
        r('demo-4', 'Call mom', '', 1440, 'medium'),
        r('demo-5', 'Submit report', 'Monthly performance report', -30, 'high', true),
    ];
};

const updatePendingCount = async () => {
    const count = await syncQueueDb.count();
    useSyncStore.getState().setPendingCount(count);
};

export const useReminderStore = create((set, get) => ({
    reminders: [],
    isLoading: true,
    error: null,
    filter: { status: 'all', priority: 'all', sortBy: 'dueDate', order: 'asc' },

    setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),

    setReminders: (reminders) => set({ reminders, isLoading: false }),

    fetchReminders: async () => {
        set({ isLoading: true, error: null });

        // Demo mode — show sample data, skip all persistence
        if (isDemo()) {
            set({ reminders: makeDemoReminders(), isLoading: false });
            return;
        }

        // 1. Load from IndexedDB instantly (always works, even offline)
        try {
            const localReminders = await remindersDb.getAll();
            set({ reminders: localReminders.filter(r => !r.isDeleted), isLoading: false });
        } catch {
            set({ isLoading: false });
            return;
        }

        // 2. Pull from server silently — errors don't affect local data
        if (navigator.onLine) {
            try {
                const lastSyncAt = await metaDb.getLastSyncAt();
                const params = lastSyncAt ? { since: lastSyncAt } : {};
                const serverReminders = await remindersApi.getAll(params);
                if (serverReminders.length > 0) {
                    await remindersDb.bulkPut(serverReminders.map(r => ({ ...r, isSynced: true })));
                    const now = new Date().toISOString();
                    await metaDb.setLastSyncAt(now);
                    useSyncStore.getState().setLastSyncAt(now);
                    const allLocal = await remindersDb.getAll();
                    set({ reminders: allLocal.filter(r => !r.isDeleted) });
                }
            } catch {
                // Server unavailable or route not ready — local data already shown, no error
            }
        }

        // 3. Run auto-cleanup after data is fully loaded
        await get().autoCleanup();
    },

    createReminder: async (dto) => {
        const clientId = uuidv4();
        const now = new Date().toISOString();
        const newReminder = {
            id: clientId,
            clientId,
            ...dto,
            isCompleted: false,
            version: 1,
            isSynced: false,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        };

        // Optimistic update
        set(state => ({ reminders: [newReminder, ...state.reminders] }));

        // Demo mode — in-memory only, no persistence
        if (isDemo()) return;

        await remindersDb.put(newReminder);

        if (navigator.onLine) {
            try {
                const created = await remindersApi.create({ clientId, ...dto });
                const synced = { ...newReminder, ...created, isSynced: true };
                await remindersDb.put(synced);
                set(state => ({
                    reminders: state.reminders.map(r => r.clientId === clientId ? synced : r),
                }));
            } catch {
                await syncQueueDb.add({ type: 'CREATE', clientId, payload: newReminder });
                await updatePendingCount();
            }
        } else {
            await syncQueueDb.add({ type: 'CREATE', clientId, payload: newReminder });
            await updatePendingCount();
        }
    },

    updateReminder: async (clientId, dto) => {
        const current = get().reminders.find(r => r.clientId === clientId);
        if (!current) return;

        const updated = {
            ...current,
            ...dto,
            version: current.version + 1,
            isSynced: false,
            updatedAt: new Date().toISOString(),
        };

        set(state => ({
            reminders: state.reminders.map(r => r.clientId === clientId ? updated : r),
        }));

        // Demo mode — in-memory only, no persistence
        if (isDemo()) return;

        await remindersDb.put(updated);

        if (navigator.onLine) {
            try {
                const serverResult = await remindersApi.update(clientId, { ...dto, version: updated.version });
                const synced = { ...updated, ...serverResult, isSynced: true };
                await remindersDb.put(synced);
                set(state => ({
                    reminders: state.reminders.map(r => r.clientId === clientId ? synced : r),
                }));
            } catch {
                await syncQueueDb.addOrMerge({ type: 'UPDATE', clientId, payload: updated });
                await updatePendingCount();
            }
        } else {
            await syncQueueDb.addOrMerge({ type: 'UPDATE', clientId, payload: updated });
            await updatePendingCount();
        }
    },

    deleteReminder: async (clientId) => {
        set(state => ({
            reminders: state.reminders.filter(r => r.clientId !== clientId),
        }));

        // Demo mode — in-memory only, no persistence
        if (isDemo()) return;

        const deletedAt = new Date().toISOString();
        await remindersDb.softDelete(clientId, deletedAt);

        if (navigator.onLine) {
            try {
                await remindersApi.remove(clientId);
                await remindersDb.remove(clientId);
            } catch {
                await syncQueueDb.addOrMerge({ type: 'DELETE', clientId, payload: { clientId, deletedAt } });
                await updatePendingCount();
            }
        } else {
            await syncQueueDb.addOrMerge({ type: 'DELETE', clientId, payload: { clientId, deletedAt } });
            await updatePendingCount();
        }
    },

    // ── Auto-cleanup ───────────────────────────────────────────
    // 1. Overdue → mark completed automatically
    // 2. Completed + not touched for 7 days → delete automatically
    autoCleanup: async () => {
        if (isDemo()) return;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const reminders = get().reminders;

        // Step 1: overdue → completed
        const overdueIds = reminders
            .filter(r => !r.isCompleted && !r.isDeleted && r.dueDate && new Date(r.dueDate) < now)
            .map(r => r.clientId);

        for (const clientId of overdueIds) {
            await get().updateReminder(clientId, { isCompleted: true });
        }

        // Step 2: completed older than 7 days → delete
        const toDelete = get().reminders
            .filter(r => r.isCompleted && r.updatedAt && new Date(r.updatedAt) < oneWeekAgo);

        for (const r of toDelete) {
            await get().deleteReminder(r.clientId);
        }
    },

    reset: () => set({ reminders: [], isLoading: false, error: null }),

    getFilteredReminders: () => {
        const { reminders, filter } = get();
        let result = [...reminders];

        if (filter.status === 'active') result = result.filter(r => !r.isCompleted);
        else if (filter.status === 'completed') result = result.filter(r => r.isCompleted);

        if (filter.priority !== 'all') result = result.filter(r => r.priority === filter.priority);

        result.sort((a, b) => {
            const valA = a[filter.sortBy] || '';
            const valB = b[filter.sortBy] || '';
            const cmp = String(valA).localeCompare(String(valB));
            return filter.order === 'asc' ? cmp : -cmp;
        });

        return result;
    },
}));
