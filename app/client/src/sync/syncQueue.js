import { syncQueueDb } from '../db/syncQueueDb';
import { useSyncStore } from '../store/syncStore';

export const syncQueue = {
    async add(operation) {
        await syncQueueDb.add(operation);
        await this.refreshCount();
    },

    async addOrMerge(operation) {
        await syncQueueDb.addOrMerge(operation);
        await this.refreshCount();
    },

    async getAll() {
        return syncQueueDb.getAll();
    },

    async removeById(id) {
        await syncQueueDb.removeById(id);
        await this.refreshCount();
    },

    async clear() {
        await syncQueueDb.clear();
        useSyncStore.getState().setPendingCount(0);
    },

    async refreshCount() {
        const count = await syncQueueDb.count();
        useSyncStore.getState().setPendingCount(count);
    },
};
