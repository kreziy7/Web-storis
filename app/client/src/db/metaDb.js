import { initDB } from './db';

export const metaDb = {
    async getLastSyncAt() {
        const db = await initDB();
        return db.get('meta', 'lastSyncAt');
    },

    async setLastSyncAt(timestamp) {
        const db = await initDB();
        return db.put('meta', timestamp, 'lastSyncAt');
    },

    async get(key) {
        const db = await initDB();
        return db.get('meta', key);
    },

    async set(key, value) {
        const db = await initDB();
        return db.put('meta', value, key);
    },

    async clear() {
        const db = await initDB();
        return db.clear('meta');
    },
};
