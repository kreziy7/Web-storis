# Task.md — Что нужно сделать

> Последнее обновление: 2026-04-13
> Ключевое слово для продолжения: **продолжаем**

---

## Приоритет 0 — Деплой сервера на Fly.io (не закончили)

> Render оказался платным, переключились на Fly.io (бесплатный tier).
> `fly.toml` уже настроен: app=`smart-reminder-api`, region=`ams`, 256mb RAM.

- [ ] Запушить код на GitHub (`git push`)
- [ ] Установить Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Залогиниться: `fly auth login`
- [ ] Зайти в папку сервера: `cd app/server`
- [ ] Запустить деплой: `fly deploy`
- [ ] Добавить переменные окружения:
  ```
  fly secrets set NODE_ENV=production
  fly secrets set MONGODB_URI=...
  fly secrets set JWT_ACCESS_SECRET=...
  fly secrets set JWT_REFRESH_SECRET=...
  fly secrets set CLIENT_URL=...
  ```
- [ ] Обновить `VITE_API_URL` на фронтенде на URL Fly.io (`https://smart-reminder-api.fly.dev`)

> **Нужен MongoDB Atlas** — бесплатный облачный MongoDB. Зарегистрироваться на atlas.mongodb.com

---

## ~~Приоритет 1 — Backend: Reminders API~~ ✅ ГОТОВО (2026-04-15)

- [x] `models/Reminder.model.js`
- [x] `controllers/reminders.controller.js` — getAll, create, update, remove, sync
- [x] `routes/reminders.routes.js` — `/api/v1/reminders` (auth protected)
- [x] `routes/index.js` — подключён

---

## Приоритет 2 — Backend: Sync API

- [ ] **`services/sync.service.js`** — batch обработка, conflict resolution (last-write-wins)
- [ ] **`controllers/sync.controller.js`** — `POST /sync`
- [ ] **`validators/sync.validators.js`** — валидация batch payload
- [ ] **`routes/sync.routes.js`** — `/api/v1/sync` (auth protected)
- [ ] Добавить `/api/v1/sync` в `routes/index.js`

---

## Приоритет 3 — Backend: Auth улучшения

- [ ] **`validators/auth.validators.js`** — email, password (мин. 8 симв., 1 заглавная, 1 цифра, 1 спецсимвол), name
- [ ] **`services/auth.service.js`** — вынести логику из контроллера в сервис
- [ ] Подключить `validate.js` и `authLimiter` в `auth.routes.js`
- [ ] Проверить: единое сообщение ошибки при неверном логине (no user enumeration)

---

## Приоритет 4 — Infra

- [ ] **`docker-compose.yml`** — MongoDB для локальной разработки
- [ ] **`app/server/.env.example`** — все переменные окружения (PORT, MONGO_URI, JWT_*, VAPID_*, FIREBASE_*)
- [ ] **`app/client/.env.example`** — VITE_API_URL, VITE_FIREBASE_* и др.

---

## Приоритет 5 — Проверка / QA

- [ ] Проверить: Lighthouse PWA score ≥ 90
- [ ] Проверить: FCM push приходит когда браузер закрыт (реальное устройство)
- [ ] Проверить: TimestampTrigger работает в Chrome 80+ (уведомление по расписанию)
- [ ] Проверить: offline fallback страница показывается без сети
- [ ] Проверить: `GET /health` возвращает 200
- [ ] Проверить: rate limiting срабатывает при превышении лимитов

---

## Выполнено (закрыто)

- [x] **Push / FCM backend** — `fcm.service.js`, `push.service.js`, `ScheduledPush`, `PushSubscription`, `push.controller.js`, `push.routes.js`
- [x] **FCM Scheduler** — `node-cron` в `server.js`, каждую минуту отправляет FCM push
- [x] **Service Worker** — `sw.js`: Workbox precache, NetworkFirst для API, FCM background messages, push event, notificationclick, TimestampTrigger
- [x] **PWA** — `vite-plugin-pwa` в `vite.config.js`, manifest, icons 192/512, offline.html
- [x] **Frontend notifications** — `fcmApi.js`, `pushApi.js`, `useNotifications.js` (FCM sync + in-app popup)
- [x] **Profile API** — `profile.controller.js`, `profile.routes.js`
- [x] **Admin** — `admin.controller.js`, `admin.routes.js`, `admin.middleware.js`
- [x] **Deploy конфиги** — Dockerfile, fly.toml, .dockerignore

---

## Прогресс

```
Backend Sync API        [ ] 0/5   ← ПРИОРИТЕТ
Backend Auth улучшения  [ ] 0/4
Infra (.env, docker)    [ ] 0/3
PWA / Push QA           [ ] 0/6

Backend Reminders API   [x] done (2026-04-15)
Firebase FCM            [x] done (2026-04-15) — FIREBASE_SERVICE_ACCOUNT в Render
Деплой Render           [x] done — https://web-storis.onrender.com
Backend Push API        [x] done
Backend Profile API     [x] done
Frontend PWA            [x] done
Frontend Notifications  [x] done (FCM + SW + in-app + TimestampTrigger fix)
Frontend Profile        [x] done
Frontend Admin          [x] done
Deploy конфиги          [x] done (Dockerfile, fly.toml, .dockerignore)
```

---

## Ключевые слова

| Слово | Что означает |
|---|---|
| `продолжаем` | Читай этот файл, начни с верхней незакрытой задачи |
| `reminder-model` | Задача: создать Reminder.model.js |
| `sync-api` | Задача: Приоритет 2 — Sync API |
| `auth-service` | Задача: рефакторинг Auth в сервисный слой |
