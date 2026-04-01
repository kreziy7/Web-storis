# 10 — Backend — детальные требования

> [← Индекс](./00_INDEX.md)

---

## Express Application Setup

Порядок middleware (важен!):

```
1. helmet()                        — security headers
2. cors()                          — CORS whitelist
3. express.json({ limit: '1mb' })  — body parsing
4. cookieParser()                  — cookie parsing
5. requestLogger                   — Winston HTTP logging
6. globalLimiter                   — rate limiting
7. /api/v1 routes
8. GET /health                     — health check
9. errorHandler                    — глобальный обработчик (последний!)
```

---

## Структура слоёв

### Routes

Только маршрутизация — никакой логики:

```
/api/v1/auth       → auth.routes.ts
/api/v1/reminders  → reminders.routes.ts
/api/v1/sync       → sync.routes.ts
/api/v1/push       → push.routes.ts
```

### Controllers

- Получают данные из `req`
- Делегируют логику в Service
- Формируют ответ в стандартном формате
- Оборачиваются в `asyncHandler` (нет try-catch в controller)

### Services

| Сервис | Ответственность |
|---|---|
| `AuthService` | Хеширование, JWT generation/verification, регистрация/логин |
| `RemindersService` | CRUD напоминаний, пагинация, фильтрация |
| `SyncService` | Обработка batch операций, conflict resolution |
| `PushService` | web-push отправка, управление подписками |

### Middleware

| Middleware | Описание |
|---|---|
| `authMiddleware` | Проверяет JWT, кладёт `req.user` |
| `errorHandler` | Преобразует ошибки в стандартный JSON ответ |
| `rateLimiter` | globalLimiter, authLimiter, syncLimiter |
| `validate` | Вызывает `validationResult`, кидает ApiError при ошибках |
| `requestLogger` | Winston: метод, URL, статус, duration, userId |

---

## Conflict Resolution

Стратегия: **Last-Write-Wins с версионированием**

```
Конфликт: client.version < server.version

Resolution:
  if server.updatedAt > client.updatedAt → server wins
  IndexedDB ← серверная версия
  Response: { conflictResolved: true, winner: "server" }
```

---

## ApiError — Кастомные ошибки

```typescript
ApiError.badRequest(message, details?)  // 400
ApiError.unauthorized(message)          // 401
ApiError.forbidden(message)             // 403
ApiError.notFound(message)              // 404
ApiError.conflict(message)              // 409
ApiError.internal(message?)             // 500
```

---

## asyncHandler — обёртка для async контроллеров

Все async route handlers оборачиваются — нет необходимости в try-catch в каждом контроллере:

```typescript
router.get('/reminders', authMiddleware, asyncHandler(remindersController.getAll));
```

---

## MongoDB Connection

- Mongoose connect с retry логикой
- События: `connected`, `error`, `disconnected` — логируются через Winston
- Connection string через `MONGODB_URI` env переменную

---

## Ownership check

Каждый endpoint, работающий с ресурсом пользователя, проверяет:

```typescript
if (reminder.userId.toString() !== req.user.id) {
  throw ApiError.forbidden('Access denied');
}
```
