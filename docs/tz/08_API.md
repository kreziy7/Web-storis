# 08 — REST API спецификация

> [← Индекс](./00_INDEX.md)

---

## Base URL

```
https://api.smart-reminder.app/api/v1
```

## Общие принципы

- Все запросы и ответы — **JSON**
- Аутентификация — `Authorization: Bearer <accessToken>`
- Идемпотентность — через `clientId` (CREATE) и `operationId` (sync)
- Версионирование — `/api/v1/`

---

## Формат ответов

**Успех:**
```json
{
  "success": true,
  "data": { },
  "meta": { "timestamp": "2024-01-15T10:30:00Z" }
}
```

**Ошибка:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [ ]
  }
}
```

## Коды ошибок

| Code | HTTP | Описание |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Невалидные данные |
| `UNAUTHORIZED` | 401 | Отсутствует / невалидный токен |
| `FORBIDDEN` | 403 | Нет прав на ресурс |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `CONFLICT` | 409 | Конфликт (duplicate clientId) |
| `RATE_LIMIT` | 429 | Превышен лимит запросов |
| `SERVER_ERROR` | 500 | Внутренняя ошибка |

---

## Auth Endpoints

### POST /auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "64abc...", "email": "user@example.com", "name": "John Doe" },
    "accessToken": "eyJhbGci..."
  }
}
```

Set-Cookie: `refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`

Ошибки: `409` — email занят, `400` — validation

---

### POST /auth/login

**Request:** `{ "email", "password" }`

**Response 200:** аналогично register

**Note:** Единое сообщение об ошибке — no user enumeration

---

### POST /auth/refresh

Обновляет access token через refresh cookie.

**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJhbGci..." } }
```

---

### POST /auth/logout

Инвалидирует refresh token.

**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

## Reminders Endpoints

> Все требуют `Authorization: Bearer <accessToken>`

### GET /reminders

**Query params:**
```
?page=1           (default: 1)
?limit=50         (default: 50, max: 100)
?isCompleted=false
?priority=high
?sortBy=dueDate   (dueDate | createdAt | updatedAt)
?order=asc        (asc | desc)
?since=<ISO>      (инкрементальный sync)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "reminders": [ { "id": "...", "clientId": "...", "title": "...", "version": 3 } ],
    "pagination": { "total": 42, "page": 1, "limit": 50, "hasMore": false }
  }
}
```

---

### POST /reminders

**Idempotent:** повторный запрос с тем же `clientId` возвращает существующую запись.

**Request:**
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2024-01-20T18:00:00Z",
  "priority": "medium",
  "tags": ["personal"]
}
```

**Response 201** (или 200 если уже существует):
```json
{
  "success": true,
  "data": { "reminder": { "id": "64abc...", "clientId": "...", "version": 1 } }
}
```

---

### PUT /reminders/:id

**Optimistic locking:** если `version` расходится — сервер возвращает merged результат.

**Request:**
```json
{ "title": "Updated title", "isCompleted": true, "version": 2 }
```

**Response 200 (без конфликта):**
```json
{ "success": true, "data": { "reminder": { }, "conflictResolved": false } }
```

**Response 200 (конфликт разрешён):**
```json
{
  "success": true,
  "data": {
    "reminder": { },
    "conflictResolved": true,
    "conflictDetails": { "clientVersion": 2, "serverVersion": 3, "winner": "server" }
  }
}
```

---

### DELETE /reminders/:id

Soft delete. Повторный DELETE возвращает 200 (idempotent).

**Response 200:**
```json
{
  "success": true,
  "data": { "id": "...", "clientId": "...", "isDeleted": true, "deletedAt": "..." }
}
```

---

## Sync Endpoint

### POST /sync

Пакетная синхронизация. Каждая операция обрабатывается независимо (partial success).

**Request:**
```json
{
  "operations": [
    {
      "operationId": "op-uuid-1",
      "type": "CREATE",
      "payload": { "clientId": "...", "title": "Meeting prep", "dueDate": "...", "priority": "high" }
    },
    {
      "operationId": "op-uuid-2",
      "type": "UPDATE",
      "payload": { "clientId": "...", "title": "Updated", "version": 3 }
    },
    {
      "operationId": "op-uuid-3",
      "type": "DELETE",
      "payload": { "clientId": "..." }
    }
  ],
  "clientTimestamp": "2024-01-15T14:30:00Z"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "results": [
      { "operationId": "op-uuid-1", "status": "created", "reminder": { } },
      { "operationId": "op-uuid-2", "status": "updated", "reminder": { } },
      { "operationId": "op-uuid-3", "status": "deleted" }
    ],
    "syncedAt": "2024-01-15T14:30:05Z",
    "serverReminders": [ ]
  }
}
```

**Статусы операций:**

| Status | Описание |
|---|---|
| `created` | Успешно создано |
| `updated` | Успешно обновлено |
| `deleted` | Успешно удалено |
| `skipped` | operationId уже обработан (idempotency) |
| `conflict_resolved` | Конфликт разрешён, сервер победил |
| `error` | Ошибка при обработке |

---

## Push Endpoints

### POST /push/subscribe

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": { "p256dh": "...", "auth": "..." }
  }
}
```

**Response 201:** `{ "success": true, "data": { "subscribed": true } }`

### DELETE /push/subscribe

Удаляет push подписку текущего пользователя.

---

## Rate Limiting

| Endpoint | Лимит |
|---|---|
| `POST /auth/login` | 5 req / 15 min per IP |
| `POST /auth/register` | 3 req / hour per IP |
| `POST /sync` | 30 req / min per user |
| Все остальные | 100 req / min per user |
