import { openDB } from 'idb';

const DB_NAME = 'smart_reminder_db';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Reminders store
            if (!db.objectStoreNames.contains('reminders')) {
                const store = db.createObjectStore('reminders', { keyPath: 'id' });
                store.createIndex('by-sync-status', 'syncStatus');
                store.createIndex('by-date', 'dueDate');
            }

            // Sync Queue store (outbox)
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            }

            // Meta store for sync state
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta');
            }
        },
    });
};
