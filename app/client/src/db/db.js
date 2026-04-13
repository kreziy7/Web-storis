import { openDB } from 'idb';

const DB_NAME = 'smart_reminder_db';
const DB_VERSION = 2;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Version 1: initial schema
            if (oldVersion < 1) {
                const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
                reminderStore.createIndex('by-isSynced', 'isSynced');
                reminderStore.createIndex('by-date', 'dueDate');
                reminderStore.createIndex('by-userId', 'userId');

                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });

                db.createObjectStore('meta');
            }

            // Version 2: fix index — was 'by-sync-status' on wrong field 'syncStatus'
            if (oldVersion === 1) {
                const store = transaction.objectStore('reminders');
                if (store.indexNames.contains('by-sync-status')) {
                    store.deleteIndex('by-sync-status');
                    store.createIndex('by-isSynced', 'isSynced');
                }
                if (!store.indexNames.contains('by-userId')) {
                    store.createIndex('by-userId', 'userId');
                }
            }
        },
    });
};
