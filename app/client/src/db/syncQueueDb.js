import { initDB } from './db';
import { v4 as uuidv4 } from 'uuid';

export const syncQueueDb = {
    async add(operation) {
        const db = await initDB();
        return db.add('syncQueue', {
            ...operation,
            operationId: uuidv4(),
            retryCount: 0,
            createdAt: new Date().toISOString(),
        });
    },

    // Full deduplication per spec:
    // CREATE + UPDATE  → CREATE with merged payload
    // CREATE + DELETE  → remove both (item never reached server)
    // UPDATE + UPDATE  → replace with latest UPDATE
    // UPDATE + DELETE  → replace UPDATE with DELETE
    async addOrMerge(operation) {
        const db = await initDB();
        const all = await db.getAll('syncQueue');
        const existing = all.find(op => op.clientId === operation.clientId);

        if (!existing) {
            return this.add(operation);
        }

        const now = new Date().toISOString();

        if (existing.type === 'CREATE' && operation.type === 'DELETE') {
            // Item never synced — just remove the CREATE from queue
            await db.delete('syncQueue', existing.id);
            return;
        }

        if (existing.type === 'CREATE' && operation.type === 'UPDATE') {
            // Merge update payload into CREATE
            await db.put('syncQueue', {
                ...existing,
                payload: { ...existing.payload, ...operation.payload },
                updatedAt: now,
            });
            return;
        }

        if (existing.type === 'UPDATE' && operation.type === 'DELETE') {
            // Upgrade to DELETE
            await db.put('syncQueue', {
                ...existing,
                type: 'DELETE',
                payload: operation.payload,
                updatedAt: now,
            });
            return;
        }

        if (existing.type === operation.type) {
            // Same type: replace with latest payload
            await db.put('syncQueue', {
                ...existing,
                payload: { ...existing.payload, ...operation.payload },
                updatedAt: now,
            });
            return;
        }

        // Fallback: just add as new operation
        return this.add(operation);
    },

    async getAll() {
        const db = await initDB();
        const all = await db.getAll('syncQueue');
        // Sort by creation time ascending for ordered processing
        return all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    async count() {
        const db = await initDB();
        return db.count('syncQueue');
    },

    async removeById(id) {
        const db = await initDB();
        return db.delete('syncQueue', id);
    },

    async clear() {
        const db = await initDB();
        return db.clear('syncQueue');
    },

    async incrementRetry(id) {
        const db = await initDB();
        const op = await db.get('syncQueue', id);
        if (op) {
            await db.put('syncQueue', {
                ...op,
                retryCount: (op.retryCount || 0) + 1,
                lastError: op.lastError,
            });
        }
    },
};
