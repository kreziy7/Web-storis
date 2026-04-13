import { initDB } from './db';

export const remindersDb = {
    async getAll() {
        const db = await initDB();
        return db.getAll('reminders');
    },

    async get(id) {
        const db = await initDB();
        return db.get('reminders', id);
    },

    async put(reminder) {
        const db = await initDB();
        return db.put('reminders', reminder);
    },

    async bulkPut(reminders) {
        const db = await initDB();
        const tx = db.transaction('reminders', 'readwrite');
        await Promise.all(reminders.map(r => tx.store.put(r)));
        await tx.done;
    },

    async remove(id) {
        const db = await initDB();
        return db.delete('reminders', id);
    },

    async softDelete(clientId, deletedAt) {
        const db = await initDB();
        const reminder = await db.get('reminders', clientId);
        if (reminder) {
            await db.put('reminders', { ...reminder, isDeleted: true, deletedAt, isSynced: false });
        }
    },

    async clear() {
        const db = await initDB();
        return db.clear('reminders');
    },
};
