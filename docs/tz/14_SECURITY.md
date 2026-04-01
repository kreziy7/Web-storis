# 14 — Безопасность

> [← Индекс](./00_INDEX.md)

---

## JWT конфигурация

| Параметр | Значение |
|---|---|
| Access Token lifetime | 15 минут |
| Refresh Token lifetime | 7 дней |
| Refresh Token хранение | `httpOnly; Secure; SameSite=Strict` cookie |
| Access Token хранение | В памяти (Zustand), **не** в localStorage |
| Алгоритм подписи | HS256 |
| Access secret | Мин. 32 символа случайной строки |
| Refresh secret | Мин. 32 символа (отдельная от access) |

---

## Пароли

| Параметр | Значение |
|---|---|
| Алгоритм | bcryptjs |
| Salt rounds | 12 |
| Требования | Мин. 8 символов, 1 заглавная, 1 цифра, 1 спецсимвол |
| Хранение | Только хеш, никогда не в ответе API |

---

## Защитные меры

| Механизм | Реализация |
|---|---|
| Security headers | `helmet()` |
| CORS | Whitelist: только `CLIENT_URL` из env |
| Rate limiting | `express-rate-limit` (отдельные лимиты для auth, sync, global) |
| Input validation | `express-validator` на всех endpoints |
| NoSQL injection | Mongoose parametrized queries |
| No user enumeration | Единое сообщение при ошибке логина |
| Body size limit | `express.json({ limit: '1mb' })` |

---

## Правила доступа к данным

- Пользователь видит только свои напоминания (`userId` filter в каждом запросе)
- `authMiddleware` обязателен на всех `/reminders`, `/sync`, `/push` routes
- Ownership check перед каждой мутацией:

```typescript
if (reminder.userId.toString() !== req.user.id) {
  throw ApiError.forbidden('Access denied');
}
```

---

## Что никогда не делать

- Не хранить `passwordHash` в ответе API
- Не хранить access token в `localStorage` или `sessionStorage`
- Не использовать одинаковые секреты для access и refresh token
- Не логировать пароли и токены
- Не возвращать разные сообщения при неверном email vs неверном пароле
