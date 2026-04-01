# ЭТАП 4 — PROJECT STRUCTURE

## Полная структура проекта

```
smart-reminder-pwa/
│
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODELS.md
│   ├── API_DESIGN.md
│   ├── PROJECT_STRUCTURE.md
│   ├── FRONTEND.md
│   ├── OFFLINE_FIRST.md
│   ├── SYNC_ENGINE.md
│   ├── PWA.md
│   ├── NOTIFICATIONS.md
│   └── PRODUCTION.md
│
├── app/
│   ├── client/                    # React PWA (Vite + TypeScript)
│   └── server/                    # Node.js + Express
│
└── docker-compose.yml
```

---

## Client Structure `/app/client`

```
client/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── offline.html               # Offline fallback page
│   └── icons/                     # PWA icons (192x192, 512x512)
│
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root component + Router
│   ├── vite-env.d.ts
│   │
│   ├── features/                  # Feature-based architecture
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── store/
│   │   │   │   └── authStore.ts   # Zustand auth slice
│   │   │   └── api/
│   │   │       └── authApi.ts
│   │   │
│   │   ├── reminders/
│   │   │   ├── components/
│   │   │   │   ├── ReminderList.tsx
│   │   │   │   ├── ReminderCard.tsx
│   │   │   │   ├── ReminderForm.tsx
│   │   │   │   └── ReminderFilters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useReminders.ts
│   │   │   │   └── useReminderMutations.ts
│   │   │   ├── store/
│   │   │   │   └── reminderStore.ts  # Zustand reminders slice
│   │   │   └── api/
│   │   │       └── remindersApi.ts
│   │   │
│   │   └── notifications/
│   │       ├── hooks/
│   │       │   └── useNotifications.ts
│   │       └── api/
│   │           └── pushApi.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Toast/
│   │   │   └── NetworkStatus/     # Online/offline indicator
│   │   ├── hooks/
│   │   │   ├── useNetworkStatus.ts
│   │   │   └── useDebounce.ts
│   │   └── utils/
│   │       ├── uuid.ts
│   │       └── date.ts
│   │
│   ├── db/                        # IndexedDB layer
│   │   ├── schema.ts              # DB schema и типы
│   │   ├── db.ts                  # idb database init
│   │   ├── remindersDb.ts         # CRUD для reminders store
│   │   ├── syncQueueDb.ts         # CRUD для syncQueue store
│   │   └── metaDb.ts              # CRUD для meta store
│   │
│   ├── sync/                      # Sync Engine
│   │   ├── syncEngine.ts          # Главный оркестратор
│   │   ├── syncQueue.ts           # Queue manager
│   │   ├── conflictResolver.ts    # Conflict resolution logic
│   │   └── networkMonitor.ts      # Network status listener
│   │
│   ├── api/                       # HTTP client
│   │   ├── axios.ts               # Axios instance + interceptors
│   │   └── types.ts               # API response types
│   │
│   ├── store/                     # Global Zustand store
│   │   ├── index.ts               # Store composition
│   │   └── syncStore.ts           # Sync status state
│   │
│   ├── config/
│   │   └── constants.ts           # App constants
│   │
│   └── types/                     # Shared TypeScript types
│       ├── reminder.ts
│       ├── auth.ts
│       └── sync.ts
│
├── service-worker/
│   └── sw.ts                      # Workbox service worker
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts             # (если используется Tailwind)
├── .env.example
└── package.json
```

---

## Server Structure `/app/server`

```
server/
├── src/
│   ├── app.ts                     # Express app setup
│   ├── server.ts                  # HTTP server, port binding
│   │
│   ├── routes/
│   │   ├── index.ts               # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── reminders.routes.ts
│   │   ├── sync.routes.ts
│   │   └── push.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── reminders.controller.ts
│   │   ├── sync.controller.ts
│   │   └── push.controller.ts
│   │
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Reminder.model.ts
│   │   └── PushSubscription.model.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── errorHandler.ts        # Global error handler
│   │   ├── rateLimiter.ts
│   │   └── validate.ts            # express-validator wrapper
│   │
│   ├── services/
│   │   ├── auth.service.ts        # JWT creation, refresh token
│   │   ├── reminders.service.ts   # Business logic
│   │   ├── sync.service.ts        # Bulk sync logic, conflict resolution
│   │   └── push.service.ts        # Web Push API
│   │
│   ├── validators/
│   │   ├── auth.validators.ts
│   │   ├── reminder.validators.ts
│   │   └── sync.validators.ts
│   │
│   ├── config/
│   │   ├── db.ts                  # MongoDB connection
│   │   ├── env.ts                 # env validation (zod)
│   │   └── constants.ts
│   │
│   ├── utils/
│   │   ├── logger.ts              # Winston logger
│   │   ├── asyncHandler.ts        # Express async wrapper
│   │   └── ApiError.ts            # Custom error class
│   │
│   └── types/
│       ├── express.d.ts           # req.user type extension
│       └── index.ts
│
├── .env.example
├── tsconfig.json
├── package.json
└── nodemon.json
```

---

## Environment Variables

### Client `.env`

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Smart Reminder
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
```

### Server `.env`

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-reminder

# JWT
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<another-long-random-string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS
CLIENT_URL=http://localhost:3000

# Web Push VAPID
VAPID_PUBLIC_KEY=<generated-vapid-public-key>
VAPID_PRIVATE_KEY=<generated-vapid-private-key>
VAPID_SUBJECT=mailto:admin@smart-reminder.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

## Package Dependencies

### Client `package.json` (key deps)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "idb": "^7.1.1",
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "typescript": "^5.3.0",
    "workbox-window": "^7.0.0"
  }
}
```

### Server `package.json` (key deps)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "express-validator": "^7.0.0",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "web-push": "^3.6.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/web-push": "^3.3.0"
  }
}
```
