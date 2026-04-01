# ЭТАП 2 — DATA MODELING

## MongoDB Schemas

### User Model

```typescript
// server/models/User.ts

interface IUser {
  _id: ObjectId;
  email: string;           // unique, indexed
  passwordHash: string;    // bcryptjs hash
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

**Индексы:**
- `email` — unique index
- `_id` — default

**Критичные поля:**
- `email` — идентификатор пользователя
- `passwordHash` — НИКОГДА не возвращается в API response
- `pushSubscriptions` — для Web Push уведомлений

---

### Reminder Model

```typescript
// server/models/Reminder.ts

interface IReminder {
  _id: ObjectId;
  clientId: string;        // UUID генерируется на клиенте — ключ идемпотентности
  userId: ObjectId;        // ref: User, indexed
  title: string;           // required, max 200 chars
  description?: string;    // max 2000 chars
  dueDate: Date;           // дата/время напоминания
  isCompleted: boolean;    // default: false
  priority: 'low' | 'medium' | 'high';  // default: 'medium'
  tags: string[];          // массив тегов

  // Sync fields
  version: number;         // инкрементируется при каждом обновлении
  isSynced: boolean;       // true = подтверждено сервером (для server-side используется иначе)
  isDeleted: boolean;      // soft delete — default: false
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;         // ключевое поле для conflict resolution
}
```

**Индексы:**
- `userId` — для выборки напоминаний пользователя
- `clientId + userId` — unique compound (защита от дублей при retry)
- `dueDate` — для сортировки и уведомлений
- `isDeleted` — partial index (только false записи в активных запросах)

**Критичные поля для синхронизации:**
| Поле | Роль |
|---|---|
| `clientId` | Генерируется на клиенте (UUID). Позволяет сделать POST idempotent |
| `version` | Счётчик изменений. Растёт при каждом UPDATE |
| `updatedAt` | Временная метка последнего изменения. Решает конфликты |
| `isDeleted` | Soft delete. Позволяет синхронизировать удаления |
| `isSynced` | На сервере всегда true. На клиенте false = ожидает sync |

---

## IndexedDB Schemas

### Store: `reminders`

```typescript
// client/db/schema.ts

interface ILocalReminder {
  id: string;              // clientId (UUID) — primary key
  serverId?: string;       // _id из MongoDB (после первой синхронизации)
  userId: string;
  title: string;
  description?: string;
  dueDate: string;         // ISO string
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];

  // Sync fields
  isSynced: boolean;       // false = есть несинхронизированные изменения
  version: number;
  isDeleted: boolean;
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;       // используется для conflict resolution
}
```

**IndexedDB indexes:**
- `id` — primary key (keyPath)
- `isSynced` — для выборки несинхронизированных записей
- `userId` — для фильтрации
- `dueDate` — для сортировки

---

### Store: `syncQueue`

```typescript
interface ISyncQueueItem {
  operationId: string;     // UUID — primary key
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'reminder';
  clientId: string;        // ссылка на reminder.id
  payload: Partial<ILocalReminder>;
  timestamp: number;       // Date.now()
  retryCount: number;      // default: 0
  lastError?: string;      // последняя ошибка при попытке sync
}
```

**IndexedDB indexes:**
- `operationId` — primary key
- `timestamp` — для обработки в хронологическом порядке
- `clientId` — для дедупликации (если несколько UPDATE на один объект)

---

### Store: `meta`

```typescript
interface IMetaEntry {
  key: string;             // primary key
  value: unknown;
}

// Используемые ключи:
// 'lastSyncAt'    → number (timestamp последней успешной синхронизации)
// 'userId'        → string (для проверки смены пользователя)
// 'syncVersion'   → number (версия схемы для миграций)
```

---

## Логика синхронизации

### Сценарий 1: Создание в offline

```
1. Пользователь создаёт reminder
2. IndexedDB: INSERT { isSynced: false, version: 1 }
3. syncQueue: ADD { type: 'CREATE', clientId, payload }
4. UI: optimistic update из IndexedDB
5. При online: POST /sync → сервер создаёт запись
6. Сервер возвращает { clientId, serverId: MongoDB._id }
7. IndexedDB: UPDATE { isSynced: true, serverId }
8. syncQueue: DELETE операцию
```

### Сценарий 2: Конфликт UPDATE

```
Клиент: { clientId: 'abc', version: 2, updatedAt: T+5, title: 'A' }
Сервер:  { clientId: 'abc', version: 3, updatedAt: T+8, title: 'B' }

Conflict detection:
  - client.version < server.version  → conflict!

Resolution (last-write-wins по updatedAt):
  - server.updatedAt (T+8) > client.updatedAt (T+5)
  → server wins

Результат:
  - IndexedDB обновляется серверной версией
  - UI перерисовывается
  - syncQueue операция удаляется
```

### Сценарий 3: Soft Delete

```
1. Пользователь удаляет reminder (offline)
2. IndexedDB: UPDATE { isDeleted: true, deletedAt: now, isSynced: false }
3. syncQueue: ADD { type: 'DELETE', clientId }
4. UI: запись исчезает из списка (фильтр по isDeleted)
5. При online: POST /sync
6. Сервер: UPDATE { isDeleted: true }
7. Сервер НЕ удаляет физически — только soft delete
8. syncQueue: DELETE операцию
```

---

## Дедупликация операций в syncQueue

Если пользователь быстро изменяет одну запись несколько раз (UPDATE + UPDATE + UPDATE) — в queue может накопиться несколько операций на один `clientId`.

**Правило дедупликации:**
- При добавлении UPDATE в queue — если уже есть UPDATE для того же `clientId`, **заменяем** его новой операцией (merge)
- CREATE + UPDATE → оставляем только CREATE с актуальными данными
- CREATE + DELETE → удаляем оба (запись так и не попала на сервер)
- UPDATE + DELETE → оставляем только DELETE
