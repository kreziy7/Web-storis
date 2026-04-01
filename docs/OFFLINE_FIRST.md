# ЭТАП 6 — OFFLINE-FIRST

## IndexedDB Setup

### db.ts — Инициализация базы данных

```typescript
// client/src/db/db.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ILocalReminder, ISyncQueueItem, IMetaEntry } from './schema';

const DB_NAME = 'smart-reminder-db';
const DB_VERSION = 1;

interface SmartReminderDB extends DBSchema {
  reminders: {
    key: string;           // clientId
    value: ILocalReminder;
    indexes: {
      'by-isSynced': boolean;
      'by-userId': string;
      'by-dueDate': string;
    };
  };
  syncQueue: {
    key: string;           // operationId
    value: ISyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-clientId': string;
    };
  };
  meta: {
    key: string;
    value: IMetaEntry;
  };
}

let dbInstance: IDBPDatabase<SmartReminderDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<SmartReminderDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SmartReminderDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Reminders store
      if (!db.objectStoreNames.contains('reminders')) {
        const store = db.createObjectStore('reminders', { keyPath: 'id' });
        store.createIndex('by-isSynced', 'isSynced');
        store.createIndex('by-userId', 'userId');
        store.createIndex('by-dueDate', 'dueDate');
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'operationId' });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-clientId', 'clientId');
      }

      // Meta store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}
```

---

### schema.ts — TypeScript типы

```typescript
// client/src/db/schema.ts

export interface ILocalReminder {
  id: string;              // clientId (UUID) — primary key
  serverId?: string;       // MongoDB _id после синхронизации
  userId: string;
  title: string;
  description?: string;
  dueDate: string;         // ISO string
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];

  // Sync fields
  isSynced: boolean;
  version: number;
  isDeleted: boolean;
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ISyncQueueItem {
  operationId: string;     // UUID
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'reminder';
  clientId: string;
  payload: Partial<ILocalReminder>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface IMetaEntry {
  key: string;
  value: unknown;
}
```

---

### remindersDb.ts — CRUD операции

```typescript
// client/src/db/remindersDb.ts

import { getDb } from './db';
import type { ILocalReminder } from './schema';

export const remindersDb = {
  async getAll(userId?: string): Promise<ILocalReminder[]> {
    const db = await getDb();
    if (userId) {
      return db.getAllFromIndex('reminders', 'by-userId', userId);
    }
    return db.getAll('reminders');
  },

  async get(id: string): Promise<ILocalReminder | undefined> {
    const db = await getDb();
    return db.get('reminders', id);
  },

  async put(reminder: ILocalReminder): Promise<void> {
    const db = await getDb();
    await db.put('reminders', reminder);
  },

  async bulkPut(reminders: ILocalReminder[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('reminders', 'readwrite');
    await Promise.all([
      ...reminders.map(r => tx.store.put(r)),
      tx.done,
    ]);
  },

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const db = await getDb();
    const reminder = await db.get('reminders', id);
    if (!reminder) return;
    await db.put('reminders', {
      ...reminder,
      isDeleted: true,
      deletedAt,
      isSynced: false,
      updatedAt: deletedAt,
    });
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('reminders', id);
  },

  async getUnsyncedCount(): Promise<number> {
    const db = await getDb();
    return (await db.getAllFromIndex('reminders', 'by-isSynced', false)).length;
  },

  async markSynced(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('reminders', 'readwrite');
    for (const id of ids) {
      const reminder = await tx.store.get(id);
      if (reminder) {
        await tx.store.put({ ...reminder, isSynced: true });
      }
    }
    await tx.done;
  },
};
```

---

### syncQueueDb.ts — Управление очередью

```typescript
// client/src/db/syncQueueDb.ts

import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { ISyncQueueItem } from './schema';

export const syncQueueDb = {
  async add(item: Omit<ISyncQueueItem, 'operationId' | 'entityType' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await getDb();
    const operation: ISyncQueueItem = {
      ...item,
      operationId: uuidv4(),
      entityType: 'reminder',
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.put('syncQueue', operation);
  },

  // Умное добавление: если UPDATE + UPDATE → merge; CREATE + DELETE → очистить оба
  async addOrMerge(item: Omit<ISyncQueueItem, 'operationId' | 'entityType' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await getDb();
    const existing = await db.getAllFromIndex('syncQueue', 'by-clientId', item.clientId);

    if (item.type === 'DELETE') {
      // Удаляем все предыдущие операции для этого clientId
      const tx = db.transaction('syncQueue', 'readwrite');
      for (const op of existing) {
        await tx.store.delete(op.operationId);
      }
      await tx.done;

      // Если была операция CREATE — не нужно отправлять DELETE (запись ещё не на сервере)
      const hasCreate = existing.some(op => op.type === 'CREATE');
      if (!hasCreate) {
        await this.add(item);
      }
      return;
    }

    if (item.type === 'UPDATE') {
      const existingUpdate = existing.find(op => op.type === 'UPDATE');
      if (existingUpdate) {
        // Merge UPDATE: обновляем payload существующей операции
        const db2 = await getDb();
        await db2.put('syncQueue', {
          ...existingUpdate,
          payload: { ...existingUpdate.payload, ...item.payload },
          timestamp: Date.now(),
        });
        return;
      }

      // Если есть CREATE — обновляем payload CREATE
      const existingCreate = existing.find(op => op.type === 'CREATE');
      if (existingCreate) {
        const db2 = await getDb();
        await db2.put('syncQueue', {
          ...existingCreate,
          payload: { ...existingCreate.payload, ...item.payload },
          timestamp: Date.now(),
        });
        return;
      }
    }

    await this.add(item);
  },

  async getAll(): Promise<ISyncQueueItem[]> {
    const db = await getDb();
    // Сортируем по timestamp (хронологический порядок)
    const all = await db.getAllFromIndex('syncQueue', 'by-timestamp');
    return all.sort((a, b) => a.timestamp - b.timestamp);
  },

  async remove(operationId: string): Promise<void> {
    const db = await getDb();
    await db.delete('syncQueue', operationId);
  },

  async removeMany(operationIds: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('syncQueue', 'readwrite');
    for (const id of operationIds) {
      await tx.store.delete(id);
    }
    await tx.done;
  },

  async incrementRetry(operationId: string, error?: string): Promise<void> {
    const db = await getDb();
    const item = await db.get('syncQueue', operationId);
    if (!item) return;
    await db.put('syncQueue', {
      ...item,
      retryCount: item.retryCount + 1,
      lastError: error,
    });
  },

  async count(): Promise<number> {
    const db = await getDb();
    return db.count('syncQueue');
  },
};
```

---

### metaDb.ts — Метаданные

```typescript
// client/src/db/metaDb.ts

import { getDb } from './db';

export const metaDb = {
  async get<T>(key: string): Promise<T | null> {
    const db = await getDb();
    const entry = await db.get('meta', key);
    return entry ? (entry.value as T) : null;
  },

  async set(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.put('meta', { key, value });
  },

  async getLastSyncAt(): Promise<number | null> {
    return this.get<number>('lastSyncAt');
  },

  async setLastSyncAt(timestamp: number): Promise<void> {
    await this.set('lastSyncAt', timestamp);
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.clear('meta');
  },
};
```

---

## Retry Механизм

### Exponential Backoff

```typescript
// client/src/sync/retry.ts

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelay: 1000,   // 1 секунда
  maxDelay: 30000,      // 30 секунд
  backoffFactor: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries) break;

      // Не ждём при первой попытке
      if (attempt > 0) {
        await sleep(delay);
        delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
      }
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## NetworkMonitor

```typescript
// client/src/sync/networkMonitor.ts

type NetworkChangeHandler = (isOnline: boolean) => void;

class NetworkMonitor {
  private handlers: Set<NetworkChangeHandler> = new Set();

  constructor() {
    window.addEventListener('online', () => this.notify(true));
    window.addEventListener('offline', () => this.notify(false));
  }

  subscribe(handler: NetworkChangeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler); // unsubscribe
  }

  private notify(isOnline: boolean): void {
    this.handlers.forEach(h => h(isOnline));
  }

  get isOnline(): boolean {
    return navigator.onLine;
  }
}

export const networkMonitor = new NetworkMonitor();
```
