# 16 — Переменные окружения

> [← Индекс](./00_INDEX.md)

---

## Client — `app/client/.env`

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Smart Reminder
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
```

| Переменная | Описание |
|---|---|
| `VITE_API_URL` | URL бэкенда |
| `VITE_APP_NAME` | Название приложения |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key для Web Push |

---

## Server — `app/server/.env`

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-reminder

# JWT
JWT_ACCESS_SECRET=<random-string-min-32-chars>
JWT_REFRESH_SECRET=<another-random-string-min-32-chars>
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

# Logging
LOG_LEVEL=info
```

| Переменная | Описание |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | Порт сервера |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Секрет для access token (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | Секрет для refresh token (отдельный!) |
| `JWT_ACCESS_EXPIRES` | Время жизни access token |
| `JWT_REFRESH_EXPIRES` | Время жизни refresh token |
| `CLIENT_URL` | URL фронтенда для CORS whitelist |
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | Контактный email для VAPID |
| `RATE_LIMIT_WINDOW_MS` | Окно для rate limiting (мс) |
| `RATE_LIMIT_MAX` | Максимум запросов в окне |
| `LOG_LEVEL` | Уровень логирования Winston |

---

## Генерация VAPID ключей

```bash
npx web-push generate-vapid-keys
```

Выводит пару public/private ключей для вставки в `.env`.
