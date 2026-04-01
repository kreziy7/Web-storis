# 15 — Структура проекта

> [← Индекс](./00_INDEX.md)

---

## Корень

```
smart-reminder-pwa/
├── README.md
├── docker-compose.yml
├── docs/
│   ├── tz/                        ← техническое задание (этот раздел)
│   ├── ARCHITECTURE.md
│   ├── DATA_MODELS.md
│   ├── API_DESIGN.md
│   └── ...
└── app/
    ├── client/                    ← React PWA
    └── server/                    ← Node.js + Express
```

---

## Client `/app/client`

```
client/
├── public/
│   ├── manifest.json              ← PWA manifest
│   ├── offline.html               ← Offline fallback
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── src/
│   ├── main.tsx                   ← Entry point
│   ├── App.tsx                    ← Root + Router
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/        (LoginForm, RegisterForm)
│   │   │   ├── hooks/             (useAuth)
│   │   │   ├── store/             (authStore.ts)
│   │   │   └── api/               (authApi.ts)
│   │   │
│   │   ├── reminders/
│   │   │   ├── components/        (ReminderList, ReminderCard, ReminderForm, ReminderFilters)
│   │   │   ├── hooks/             (useReminders, useReminderMutations)
│   │   │   ├── store/             (reminderStore.ts)
│   │   │   └── api/               (remindersApi.ts)
│   │   │
│   │   └── notifications/
│   │       ├── hooks/             (useNotifications)
│   │       └── api/               (pushApi.ts)
│   │
│   ├── shared/
│   │   ├── components/            (Button, Input, Modal, Toast, NetworkStatus)
│   │   ├── hooks/                 (useNetworkStatus, useDebounce)
│   │   └── utils/                 (uuid.ts, date.ts)
│   │
│   ├── db/                        ← IndexedDB layer
│   │   ├── schema.ts
│   │   ├── db.ts                  ← idb init
│   │   ├── remindersDb.ts
│   │   ├── syncQueueDb.ts
│   │   └── metaDb.ts
│   │
│   ├── sync/                      ← Sync Engine
│   │   ├── syncEngine.ts          ← главный оркестратор
│   │   ├── syncQueue.ts
│   │   ├── conflictResolver.ts
│   │   └── networkMonitor.ts
│   │
│   ├── api/
│   │   ├── axios.ts               ← Axios instance + interceptors
│   │   └── types.ts
│   │
│   ├── store/
│   │   ├── index.ts
│   │   └── syncStore.ts
│   │
│   ├── config/
│   │   └── constants.ts
│   │
│   └── types/
│       ├── reminder.ts
│       ├── auth.ts
│       └── sync.ts
│
├── service-worker/
│   └── sw.ts                      ← Workbox service worker
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## Server `/app/server`

```
server/
└── src/
    ├── app.ts                     ← Express setup
    ├── server.ts                  ← HTTP server, port binding
    │
    ├── routes/
    │   ├── index.ts               ← Route aggregator
    │   ├── auth.routes.ts
    │   ├── reminders.routes.ts
    │   ├── sync.routes.ts
    │   └── push.routes.ts
    │
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── reminders.controller.ts
    │   ├── sync.controller.ts
    │   └── push.controller.ts
    │
    ├── models/
    │   ├── User.model.ts
    │   ├── Reminder.model.ts
    │   └── PushSubscription.model.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts     ← JWT verification
    │   ├── errorHandler.ts
    │   ├── rateLimiter.ts
    │   ├── validate.ts
    │   └── requestLogger.ts
    │
    ├── services/
    │   ├── auth.service.ts
    │   ├── reminders.service.ts
    │   ├── sync.service.ts
    │   └── push.service.ts
    │
    ├── validators/
    │   ├── auth.validators.ts
    │   ├── reminder.validators.ts
    │   └── sync.validators.ts
    │
    ├── config/
    │   ├── db.ts                  ← MongoDB connection
    │   ├── env.ts                 ← env validation (zod)
    │   └── constants.ts
    │
    └── utils/
        ├── logger.ts              ← Winston
        ├── asyncHandler.ts
        └── ApiError.ts

├── .env.example
├── tsconfig.json
├── nodemon.json
└── package.json
```
