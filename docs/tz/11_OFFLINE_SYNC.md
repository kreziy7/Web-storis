# 11 — Offline-first и синхронизация

> [← Индекс](./00_INDEX.md)

---

## IndexedDB Schema (версия 1)

```typescript
const db = openDB('smart-reminder-db', 1, {
  upgrade(db) {
    // reminders
    const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
    reminderStore.createIndex('isSynced', 'isSynced');
    reminderStore.createIndex('userId', 'userId');
    reminderStore.createIndex('dueDate', 'dueDate');

    // syncQueue
    const queueStore = db.createObjectStore('syncQueue', { keyPath: 'operationId' });
    queueStore.createIndex('timestamp', 'timestamp');
    queueStore.createIndex('clientId', 'clientId');

    // meta
    db.createObjectStore('meta', { keyPath: 'key' });
  }
});
```

---

## Sync Engine — алгоритм

### При инициализации приложения

```
1. Загрузить reminders из IndexedDB → показать пользователю (мгновенно)
2. Если navigator.onLine:
   a. GET /reminders?since=lastSyncAt
   b. Merge результата с IndexedDB
3. Запустить networkMonitor
```

### При событии 'online'

```
1. syncStore.setIsSyncing(true)
2. Читаем все операции из syncQueue (сортировка по timestamp ASC)
3. Дедуплицируем операции по clientId
4. POST /sync с batch payload
5. Обрабатываем results:
   - created/updated/deleted → IndexedDB: isSynced: true
   - conflict_resolved       → IndexedDB ← серверная версия
   - skipped                 → удаляем из queue
6. Обновляем Zustand Store
7. Очищаем обработанные операции из syncQueue
8. metaDb.set('lastSyncAt', Date.now())
9. syncStore.setIsSyncing(false)
```

### При ошибке sync

```
1. retryCount++ для каждой неудачной операции
2. Exponential backoff: Math.pow(2, retryCount) * 1000 мс
3. syncStore.setSyncError(message)
4. Следующая попытка при следующем событии 'online'
```

---

## Сценарий 1 — Создание напоминания offline

```
1. UUID генерируется на клиенте (uuidv4)
2. IndexedDB: INSERT { isSynced: false, version: 1 }
3. syncQueue: ADD { type: 'CREATE', clientId, payload }
4. UI: optimistic update из IndexedDB

При online:
5. POST /sync → { type: 'CREATE', payload }
6. Server: findOneAndUpdate({ clientId }, payload, { upsert: true })
7. Response: { clientId, serverId: MongoDB._id, version: 1 }
8. IndexedDB: UPDATE { isSynced: true, serverId }
9. syncQueue: DELETE операцию
```

---

## Сценарий 2 — Конфликт UPDATE

```
Client: { clientId: 'abc', version: 2, updatedAt: T+5, title: 'A' }
Server: { clientId: 'abc', version: 3, updatedAt: T+8, title: 'B' }

Conflict detection: client.version < server.version → конфликт!

Resolution (last-write-wins по updatedAt):
  server.updatedAt (T+8) > client.updatedAt (T+5) → server wins

Результат:
  IndexedDB ← серверная версия
  UI перерисовывается
  syncQueue операция удаляется
```

---

## Сценарий 3 — Soft Delete offline

```
1. IndexedDB: UPDATE { isDeleted: true, deletedAt: now, isSynced: false }
2. UI: запись скрыта (фильтр isDeleted)
3. syncQueue: ADD { type: 'DELETE', clientId }

При online:
4. POST /sync → { type: 'DELETE', clientId }
5. Server: UPDATE reminder { isDeleted: true } (физически не удаляем!)
6. syncQueue: DELETE операцию
```

---

## Дедупликация операций в syncQueue

| Ситуация | Результат |
|---|---|
| UPDATE + UPDATE | Заменяем последней операцией |
| CREATE + UPDATE | CREATE с актуальными данными |
| CREATE + DELETE | Удаляем оба (запись не попала на сервер) |
| UPDATE + DELETE | Оставляем только DELETE |
