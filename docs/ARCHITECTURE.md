# ЭТАП 1 — SYSTEM DESIGN & ARCHITECTURE

## 1. Общая архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐  │
│  │  React UI   │───▶│  Zustand     │───▶│  API Layer  │  │
│  │  Components │    │  State Store │    │  (Axios)    │  │
│  └─────────────┘    └──────────────┘    └──────┬──────┘  │
│                                                 │         │
│  ┌──────────────────────────────────────────────▼──────┐  │
│  │                  SYNC ENGINE                         │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │  IndexedDB  │  │  Queue   │  │  Conflict     │  │  │
│  │  │  (idb lib)  │◀▶│  Manager │  │  Resolver     │  │  │
│  │  └─────────────┘  └──────────┘  └───────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SERVICE WORKER (Workbox)                │  │
│  │   Cache-First (static)  │  Network-First (API)       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                    HTTPS REST API
                          │
┌─────────────────────────────────────────────────────────┐
│                      SERVER LAYER                        │
│                                                          │
│  ┌───────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │   Auth    │  │  Reminders │  │     Sync Handler   │  │
│  │ Controller│  │ Controller │  │  (Bulk Operations) │  │
│  └───────────┘  └────────────┘  └────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               Middleware Layer                        │  │
│  │  JWT Auth  │  Rate Limit  │  Error Handler  │  CORS  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  MongoDB (Mongoose)                   │  │
│  │       Users  │  Reminders  │  Push Subscriptions      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Ответственность каждого слоя

### Frontend — React PWA

| Компонент | Ответственность |
|---|---|
| **UI Components** | Рендеринг, пользовательский ввод |
| **Zustand Store** | Глобальное состояние (reminders, auth, sync status) |
| **API Layer** | HTTP запросы, interceptors, retry |
| **Sync Engine** | Оркестрация offline ↔ online синхронизации |
| **IndexedDB** | Локальное персистентное хранилище |
| **Queue Manager** | Буфер несинхронизированных операций |
| **Service Worker** | Кеш статики, offline fallback, push события |

### Backend — Node.js + Express

| Компонент | Ответственность |
|---|---|
| **Routes** | Маршрутизация HTTP запросов |
| **Controllers** | Бизнес-логика, валидация |
| **Middleware** | JWT, rate limiting, error handling |
| **Models** | Mongoose схемы, валидация данных |
| **Sync Handler** | Обработка batch операций, conflict resolution |
| **Push Service** | Отправка Web Push уведомлений |
| **Logger** | Winston: request logs, error logs |

### Database — MongoDB

| Коллекция | Назначение |
|---|---|
| `users` | Учётные данные, JWT refresh tokens |
| `reminders` | Напоминания со статусом синхронизации |
| `pushSubscriptions` | Web Push endpoint подписки |

### Offline Storage — IndexedDB

| Хранилище | Назначение |
|---|---|
| `reminders` | Локальная копия напоминаний |
| `syncQueue` | Очередь несинхронизированных операций |
| `meta` | Метаданные (lastSyncAt, userId) |

---

## 3. Data Flow

### ONLINE режим

```
User Action
    │
    ▼
UI Component
    │
    ▼
Zustand Store (optimistic update)
    │
    ├──▶ IndexedDB (запись, isSynced: true)
    │
    └──▶ API Layer ──▶ Express Server ──▶ MongoDB
                           │
                      Ответ 200
                           │
                    Zustand обновляет state
```

**Принцип**: Optimistic UI — интерфейс обновляется сразу, запрос идёт параллельно. При ошибке — откат.

---

### OFFLINE режим

```
User Action
    │
    ▼
UI Component
    │
    ▼
Zustand Store (optimistic update)
    │
    ├──▶ IndexedDB (запись, isSynced: false)
    │
    └──▶ SyncQueue (операция: CREATE/UPDATE/DELETE)
              │
         Сохраняется локально до восстановления сети
```

**Принцип**: Все изменения сохраняются в IndexedDB с флагом `isSynced: false` и добавляются в `syncQueue`.

---

### Восстановление сети

```
Network Online Event
    │
    ▼
Sync Engine запускается
    │
    ▼
Читает все операции из syncQueue
    │
    ▼
POST /sync (batch payload)
    │
    ▼
Server обрабатывает все операции
    │
    ├── Conflict check (по version + updatedAt)
    │
    └── Возвращает merged результат
              │
              ▼
    IndexedDB обновляется (isSynced: true)
              │
              ▼
    Zustand Store обновляется
              │
              ▼
    syncQueue очищается
```

---

## 4. Sync Механизм

### Накопление offline изменений

Каждая операция (CREATE, UPDATE, DELETE) помещается в `syncQueue` с полной записью:

```
{
  operationId: uuid,
  type: "CREATE" | "UPDATE" | "DELETE",
  entity: "reminder",
  payload: { ...reminderData },
  timestamp: Date.now(),
  retryCount: 0
}
```

### Отправка на сервер

При восстановлении сети (событие `navigator.onLine` или `online` event):

1. Все операции из `syncQueue` собираются в один batch
2. Отправляется `POST /sync` с массивом операций
3. Сервер применяет их последовательно

### Разрешение конфликтов

Стратегия: **Last-Write-Wins с версионированием**

- Каждая запись имеет `version: number` и `updatedAt: Date`
- При конфликте: побеждает запись с **большим `updatedAt`**
- Если `version` расходится — сервер возвращает merged объект
- Клиент применяет серверный результат как источник истины

```
Client record:  { version: 3, updatedAt: T+10 }
Server record:  { version: 3, updatedAt: T+12 }

→ Winner: Server record (updatedAt больше)
→ Client обновляет локальную запись
```

---

## 5. Безопасность

| Механизм | Применение |
|---|---|
| JWT Access Token | Короткоживущий (15 мин), в memory |
| JWT Refresh Token | Долгоживущий (7 дней), в httpOnly cookie |
| bcryptjs | Хеширование паролей (salt rounds: 12) |
| Rate Limiting | 100 req/min per IP |
| CORS | Whitelist доменов |
| Helmet.js | Security headers |
| Input validation | express-validator на всех endpoints |
