# 07 — Модели данных

> [← Индекс](./00_INDEX.md)

---

## MongoDB — User

```typescript
interface IUser {
  _id: ObjectId;
  email: string;           // unique, indexed, lowercase
  passwordHash: string;    // bcryptjs — НИКОГДА не в ответе API
  name: string;
  pushSubscriptions: IPushSubscription[];
  createdAt: Date;
  updatedAt: Date;
}

interface IPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}
```

**Индексы:** `email` (unique)

---

## MongoDB — Reminder

```typescript
interface IReminder {
  _id: ObjectId;
  clientId: string;        // UUID v4, ключ идемпотентности
  userId: ObjectId;        // ref: User, indexed
  title: string;           // required, max 200
  description?: string;    // max 2000
  dueDate: Date;           // indexed
  isCompleted: boolean;    // default: false
  priority: 'low' | 'medium' | 'high';  // default: 'medium'
  tags: string[];

  // Sync fields
  version: number;         // инкрементируется при каждом UPDATE
  isSynced: boolean;       // на сервере всегда true
  isDeleted: boolean;      // soft delete, default: false
  deletedAt?: Date;
  notified: boolean;       // push-уведомление отправлено

  createdAt: Date;
  updatedAt: Date;         // используется для conflict resolution
}
```

**Индексы:**
- `userId`
- `{ clientId, userId }` — compound unique (защита от дублей)
- `dueDate`
- `isDeleted` — partial
- `{ userId, dueDate }` — partial (isDeleted: false)

---

## IndexedDB — reminders

```typescript
interface ILocalReminder {
  id: string;              // clientId — primary key
  serverId?: string;       // MongoDB _id (после синхронизации)
  userId: string;
  title: string;
  description?: string;
  dueDate: string;         // ISO string
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  isSynced: boolean;       // false = ожидает sync
  version: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Indexes:** `isSynced`, `userId`, `dueDate`

---

## IndexedDB — syncQueue

```typescript
interface ISyncQueueItem {
  operationId: string;     // UUID — primary key
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'reminder';
  clientId: string;        // ссылка на reminder
  payload: Partial<ILocalReminder>;
  timestamp: number;       // Date.now()
  retryCount: number;      // default: 0
  lastError?: string;
}
```

**Indexes:** `timestamp`, `clientId`

**Правила дедупликации операций:**

| Ситуация | Результат |
|---|---|
| UPDATE + UPDATE | Заменяем последней |
| CREATE + UPDATE | CREATE с актуальными данными |
| CREATE + DELETE | Удаляем оба |
| UPDATE + DELETE | Оставляем только DELETE |

---

## IndexedDB — meta

Key-value хранилище:

| Key | Value | Описание |
|---|---|---|
| `lastSyncAt` | number (timestamp) | Время последней успешной синхронизации |
| `userId` | string | Для проверки смены пользователя |
| `syncVersion` | number | Версия схемы для миграций |
