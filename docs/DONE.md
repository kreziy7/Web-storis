# DONE — Что уже сделано

> Последнее обновление: 2026-04-10

---

## Frontend (`app/client/src`)

### Auth
- [x] `LoginForm.jsx` — форма входа с валидацией
- [x] `RegisterForm.jsx` — форма регистрации
- [x] `authStore.js` — Zustand store (user, accessToken in-memory, isAuthenticated, initialize, login, register, logout + очистка IndexedDB/stores при logout)
- [x] `authApi.js` — API методы: login, register, logout, refresh (исправлен формат ответа: `response.data` вместо `response.data.data`)
- [x] `useAuth.js` — hook-обёртка над authStore
- [x] `Auth.css` — стили для форм авторизации
- [x] **Demo Account** — кнопка "Try Demo Account" в LoginForm и RegisterForm; `loginAsDemo()` в authStore (`isDemo: true`, без API/localStorage); reminderStore пропускает IndexedDB/syncQueue/API в demo режиме, показывает 5 sample reminders; демо баннер в App.jsx

### Reminders (CRUD)
- [x] `ReminderList.jsx` — список напоминаний с sync status
- [x] `ReminderCard.jsx` — карточка: checkbox, edit, delete, sync indicator
- [x] `ReminderForm.jsx` — форма создания и редактирования
- [x] `ReminderFilters.jsx` — фильтрация (статус, приоритет) и сортировка
- [x] `reminderStore.js` — Zustand store с optimistic UI
- [x] `remindersApi.js` — API методы для работы с напоминаниями
- [x] `useReminders.js` — hook загрузки (IndexedDB сначала → сервер)
- [x] `useReminderMutations.js` — создание/обновление/удаление (optimistic)
- [x] `Reminders.css` — стили

### Shared компоненты
- [x] `Button.jsx` + `Button.css`
- [x] `Input.jsx` + `Input.css`
- [x] `Modal.jsx` + `Modal.css`
- [x] `Toast.jsx` + `Toast.css` — всплывающие уведомления
- [x] `NetworkStatus.jsx` + `NetworkStatus.css` — online/offline индикатор

### Shared hooks
- [x] `useNetworkStatus.js` — подписка на события `online`/`offline`
- [x] `useDebounce.js` — дебаунс для поисковых полей

### Notifications
- [x] `features/notifications/hooks/useNotifications.js` — таймеры по dueDate, browser Notification API, проверка пропущенных при возврате на сайт (visibilitychange)
- [x] `shared/utils/melody.js` — Web Audio API мелодия ~3.5 сек (C5→E5→G5→C6→G5→E5→C5)

### Profile & Theme
- [x] `store/themeStore.js` — 5 тем: Forest, Ocean, Midnight, Sakura, Desert; сохраняется в localStorage, применяется через CSS-переменные
- [x] `features/profile/components/ProfilePage.jsx` — страница профиля: аватар, смена имени/email (с подтверждением пароля), смена пароля, выбор темы
- [x] `features/profile/components/ProfilePage.css` — стили страницы профиля
- [x] `features/profile/api/profileApi.js` — API: updateProfile, changePassword
- [x] `App.jsx` — маршрут `/profile`, кликабельное имя в хедере ведёт на профиль, мини-аватар

### Shared utils
- [x] `uuid.js` — генерация clientId через uuidv4
- [x] `date.js` — утилиты работы с датами

### IndexedDB слой (`db/`)
- [x] `db.js` — инициализация idb, схема v1 (reminders, syncQueue, meta)
- [x] `remindersDb.js` — CRUD по reminders в IndexedDB (+ `clear()`)
- [x] `syncQueueDb.js` — операции с очередью синхронизации (+ `clear()`)
- [x] `metaDb.js` — хранение метаданных (lastSyncAt и др.) (+ `clear()`)

### Sync Engine (`sync/`)
- [x] `syncEngine.js` — главный оркестратор синхронизации
- [x] `syncQueue.js` — управление очередью pending-операций
- [x] `conflictResolver.js` — last-write-wins по updatedAt
- [x] `networkMonitor.js` — отслеживание online/offline событий

### Stores
- [x] `syncStore.js` — isSyncing, pendingCount, lastSyncAt, syncError
- [x] `store/index.js` — агрегатор сторов

### Config & API
- [x] `config/constants.js` — константы приложения
- [x] `api/axios.js` — Axios instance + request/response interceptors (JWT, auto-refresh)

### App
- [x] `App.jsx` — Router, PrivateRoute, Header (+ NotificationBell 🔔), Footer, Toast, NetworkStatus
- [x] `main.jsx` — Entry point
- [x] `App.css`, `index.css` — Cloud тема (светлая, воздушная, на основе THEME.md зелёных цветов)
- [x] Все CSS обновлены под cloud тему: Auth, Button, Input, Reminders, Toast, Modal, NetworkStatus
- [x] **UI polish**: тексты "My Reminders / No reminders found" — цвет `--primary`; вспомогательный текст через `--text-on-bg`; инпуты с `--bg-input`, `inset` shadow, hover на `--bg-elevated`; анимации pageEnter, fadeDown, cardEnter stagger, fadeUp

---

## Backend (`app/server/src`)

### Core
- [x] `app.js` — Express setup: helmet, cors, json, cookieParser, requestLogger, routes, errorHandler
- [x] `server.js` — HTTP server, port binding

### Auth
- [x] `controllers/auth.controller.js` — register, login, logout, refresh
- [x] `routes/auth.routes.js` — маршруты аутентификации
- [x] `models/User.model.js` — Mongoose User schema (email, passwordHash, name, refreshToken)

### Middleware
- [x] `middleware/auth.middleware.js` — JWT верификация, `req.user`
- [x] `middleware/errorHandler.js` — глобальный обработчик ошибок → стандартный JSON
- [x] `middleware/requestLogger.js` — Winston HTTP logging

### Utils
- [x] `utils/ApiError.js` — кастомные ошибки (400/401/403/404/409/500)
- [x] `utils/asyncHandler.js` — обёртка для async controllers (no try-catch)
- [x] `utils/logger.js` — Winston логгер

### Config
- [x] `config/db.js` — MongoDB connection с retry логикой
- [x] `config/env.js` — валидация env переменных

### Routes
- [x] `routes/index.js` — агрегатор маршрутов

---

## Добавлено 2026-04-10 — Push / FCM / PWA / Background Notifications

### Backend: Push & FCM
- [x] `services/fcm.service.js` — Firebase Admin SDK: `sendToToken`, `sendToTokens`, удаление невалидных токенов
- [x] `services/push.service.js` — VAPID web-push: `saveSubscription`, `deleteSubscription`, `sendPush`, `notifyUser`, `410 Gone` обработка
- [x] `models/PushSubscription.model.js` — Mongoose схема (userId, endpoint, keys)
- [x] `models/ScheduledPush.model.js` — Mongoose схема (userId, fcmToken, reminderClientId, title, body, dueDate, sent)
- [x] `controllers/push.controller.js` — `getVapidPublicKey`, `syncSchedule` (заменяет unsent расписание), `testPush`
- [x] `routes/push.routes.js` — `/api/v1/push` (auth protected)
- [x] `server.js` — добавлен `node-cron` scheduler: каждую минуту находит `ScheduledPush` с `dueDate` в ближайшие 60 сек и отправляет FCM push через `fcm.service.js`
- [x] `app/server/smart-reminder-67da6-firebase-adminsdk-fbsvc-f7863ba64c.json` — Firebase service account

### Backend: Profile & Admin
- [x] `controllers/profile.controller.js` — обновление профиля, смена пароля
- [x] `routes/profile.routes.js` — `PUT /api/v1/profile`, `PUT /api/v1/profile/password`
- [x] `controllers/admin.controller.js` — админ функциональность
- [x] `routes/admin.routes.js` — `/api/v1/admin` (admin protected)
- [x] `middleware/admin.middleware.js` — проверка роли admin

### Frontend: PWA / Service Worker
- [x] `vite.config.js` — подключён `vite-plugin-pwa` (injectManifest стратегия, manifest с иконками 192/512, theme_color, display: standalone)
- [x] `src/sw.js` — Service Worker: Workbox precache + NetworkFirst для `/api/` + CacheFirst для images + FCM `onBackgroundMessage` (показывает уведомление когда вкладка закрыта) + `push` event handler + `notificationclick` (фокус/открытие окна) + `SCHEDULE_REMINDERS` message (TimestampTrigger Chrome 80+)
- [x] `public/offline.html` — offline fallback страница
- [x] `public/icon-192.png`, `public/icon-512.png` — PWA иконки
- [x] `generate-icons.cjs` — скрипт генерации иконок

### Frontend: Notifications
- [x] `features/notifications/api/fcmApi.js` — `requestFCMToken` (кеширование), `syncFCMSchedule` → `POST /push/sync-schedule`
- [x] `features/notifications/api/pushApi.js` — VAPID web-push API вызовы
- [x] `features/notifications/hooks/useNotifications.js` — обновлён: setTimeout (in-app popup + melody), `syncFCMSchedule` при каждом изменении reminders, проверка пропущенных при visibilitychange
- [x] `config/firebase.js` — Firebase инициализация + `getFCMToken`

### Frontend: Shared компоненты (новые)
- [x] `shared/components/ReminderAlert.jsx` + `ReminderAlert.css` — in-app popup при срабатывании reminder
- [x] `shared/components/SplashScreen.jsx` + `SplashScreen.css` — заставка при загрузке
- [x] `shared/hooks/` — дополнительные хуки
- [x] `shared/i18n/` — интернационализация
- [x] `shared/utils/` — утилиты (uuid, date, melody и др.)

---

## Добавлено 2026-04-12 — Deploy подготовка & уведомления фикс

### Backend: Deploy конфиги
- [x] `app/server/Dockerfile` — Docker образ на node:20-alpine
- [x] `app/server/.dockerignore` — исключения для Docker
- [x] `app/server/fly.toml` — конфиг для Fly.io (на случай если понадобится)
- [x] Исправлен путь к Firebase service account в `fcm.service.js` (`../../../` → `../../`)

### Frontend: Уведомления фикс
- [x] `useNotifications.js` — добавлена отправка `SCHEDULE_REMINDERS` сообщения в Service Worker → `TimestampTrigger` теперь реально вызывается (уведомления когда вкладка закрыта, браузер открыт, Chrome 80+)
