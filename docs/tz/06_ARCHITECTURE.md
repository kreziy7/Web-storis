# 06 — Архитектура системы

> [← Индекс](./00_INDEX.md)

---

## Общая схема

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
│  │Controller │  │ Controller │  │  (Bulk Operations) │  │
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

## Data Flow — Online режим

```
User Action
    │
    ▼
UI Component
    │
    ▼
Zustand Store ← optimistic update (мгновенно)
    │
    ├──▶ IndexedDB (isSynced: true)
    │
    └──▶ API Layer ──▶ Express ──▶ MongoDB
                           │
                      Ответ 200
                           │
                    Zustand обновляет state
```

---

## Data Flow — Offline режим

```
User Action
    │
    ▼
Zustand Store ← optimistic update
    │
    ├──▶ IndexedDB (isSynced: false)
    │
    └──▶ SyncQueue { type: CREATE | UPDATE | DELETE }
              │
         Хранится локально до восстановления сети
```

---

## Data Flow — Синхронизация при восстановлении сети

```
Network Online Event
    │
    ▼
Sync Engine запускается
    │
    ▼
Читает все операции из syncQueue (хронологически)
    │
    ▼
POST /sync — batch payload
    │
    ▼
Server обрабатывает каждую операцию независимо
    │
    ├── Conflict check (version + updatedAt)
    │
    └── Возвращает merged результат
              │
              ▼
    IndexedDB: isSynced: true
              │
              ▼
    Zustand Store обновляется
              │
              ▼
    syncQueue очищается
```

---

## Ответственность компонентов

### Frontend

| Компонент | Ответственность |
|---|---|
| **UI Components** | Рендеринг, пользовательский ввод |
| **Zustand Store** | Глобальное состояние (reminders, auth, sync) |
| **API Layer (Axios)** | HTTP запросы, interceptors, auto token refresh |
| **Sync Engine** | Оркестрация offline ↔ online синхронизации |
| **IndexedDB** | Локальное персистентное хранилище |
| **Queue Manager** | Буфер несинхронизированных операций |
| **Service Worker** | Кеш статики, offline fallback, push события |

### Backend

| Компонент | Ответственность |
|---|---|
| **Routes** | Маршрутизация HTTP запросов |
| **Controllers** | Координация слоёв, формирование ответов |
| **Services** | Бизнес-логика, conflict resolution |
| **Middleware** | JWT, rate limiting, error handling, validation |
| **Models** | Mongoose схемы |
| **Push Service** | Отправка Web Push уведомлений |
| **Logger** | Winston request logs, error logs |
