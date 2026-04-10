import { useSyncStore } from '../store/syncStore';
import { initDB } from '../db/db';
import axiosInstance from '../api/axios';

export const syncEngine = {
    async triggerSync() {
        const { isSyncing, setIsSyncing, setPendingCount, setLastSyncAt, setSyncError } = useSyncStore.getState();

        if (isSyncing || !navigator.onLine) return;

        const db = await initDB();
        const queue = await db.getAll('syncQueue');

        if (queue.length === 0) {
            setPendingCount(0);
            return;
        }

        setIsSyncing(true);
        setSyncError(null);

        try {
            const operations = queue.map(item => ({
                operationId: item.id,
                type: item.type,
                payload: item.payload
            }));

            const response = await axiosInstance.post('/sync', {
                operations,
                clientTimestamp: new Date().toISOString()
            });

            if (response.data.success) {
                // Clear successfully synced items from queue
                const tx = db.transaction('syncQueue', 'readwrite');
                for (const op of response.data.data.results) {
                    if (op.status !== 'error') {
                        await tx.store.delete(op.operationId);
                    }
                }
                await tx.done;

                setLastSyncAt(new Date().toISOString());
                setPendingCount(0);
            }
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncError('Sync failed. Will retry later.');
        } finally {
            setIsSyncing(false);
            // Update pending count
            const remaining = await db.count('syncQueue');
            setPendingCount(remaining);
        }
    },

    init() {
        window.addEventListener('online', () => this.triggerSync());
        // Also trigger on load if online
        if (navigator.onLine) {
            this.triggerSync();
        }

        // Check pending count periodically
        setInterval(async () => {
            const db = await initDB();
            const count = await db.count('syncQueue');
            useSyncStore.getState().setPendingCount(count);
        }, 5000);
    }
};
