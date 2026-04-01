# ЭТАП 3 — API DESIGN

## Base URL

```
https://api.smart-reminder.app/api/v1
```

## Общие принципы

- Все запросы и ответы в **JSON**
- Аутентификация через **Bearer JWT** в заголовке `Authorization`
- Все POST/PUT запросы идемпотентны через `clientId`
- Версионирование через `/api/v1/`
- Стандартный формат ошибок

### Формат успешного ответа

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Формат ошибки

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [ ... ]
  }
}
```

### Коды ошибок

| Code | HTTP Status | Описание |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Невалидные данные запроса |
| `UNAUTHORIZED` | 401 | Отсутствует или невалидный токен |
| `FORBIDDEN` | 403 | Нет прав на ресурс |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `CONFLICT` | 409 | Конфликт данных (duplicate clientId) |
| `RATE_LIMIT` | 429 | Превышен лимит запросов |
| `SERVER_ERROR` | 500 | Внутренняя ошибка сервера |

---

## Auth Endpoints

### POST /auth/register

Регистрация нового пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation:**
- `email`: valid email format, unique
- `password`: min 8 chars, 1 uppercase, 1 digit, 1 special char
- `name`: 2–50 chars

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64abc...",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGci..."
  }
}
```

**Set-Cookie:** `refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`

**Errors:**
- `409` — email уже зарегистрирован
- `400` — validation errors

---

### POST /auth/login

Вход в систему.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64abc...",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGci..."
  }
}
```

**Errors:**
- `401` — неверный email или пароль (единое сообщение — no user enumeration)

---

### POST /auth/refresh

Обновление access token через refresh token из cookie.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```

---

### POST /auth/logout

Инвалидация refresh token.

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## Reminders Endpoints

> Все требуют `Authorization: Bearer <accessToken>`

### GET /reminders

Получить все напоминания пользователя.

**Query params:**
```
?page=1           (default: 1)
?limit=50         (default: 50, max: 100)
?isCompleted=false
?priority=high
?sortBy=dueDate   (dueDate | createdAt | updatedAt)
?order=asc        (asc | desc)
?since=<ISO date> (только изменённые после даты — для инкрементального sync)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "reminders": [
      {
        "id": "64abc...",
        "clientId": "uuid-v4",
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "dueDate": "2024-01-20T18:00:00Z",
        "isCompleted": false,
        "priority": "medium",
        "tags": ["personal", "shopping"],
        "version": 3,
        "isDeleted": false,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T12:30:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 50,
      "hasMore": false
    }
  }
}
```

---

### POST /reminders

Создать напоминание.

**Idempotency:** Повторный запрос с тем же `clientId` вернёт существующую запись (не создаст дубль).

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
  "data": {
    "reminder": {
      "id": "64abc...",
      "clientId": "550e8400-...",
      "version": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

### PUT /reminders/:id

Обновить напоминание.

**URL Param:** `:id` — MongoDB `_id` или `clientId`

**Request:**
```json
{
  "title": "Buy more groceries",
  "isCompleted": true,
  "version": 2
}
```

**Optimistic Locking:** Если `version` в запросе не совпадает с текущей версией на сервере — возвращается ответ с актуальными данными вместо ошибки (merge strategy).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "reminder": { ... },
    "conflictResolved": false
  }
}
```

**При конфликте версий (conflictResolved: true):**
```json
{
  "success": true,
  "data": {
    "reminder": { /* серверная версия — source of truth */ },
    "conflictResolved": true,
    "conflictDetails": {
      "clientVersion": 2,
      "serverVersion": 3,
      "winner": "server"
    }
  }
}
```

---

### DELETE /reminders/:id

Мягкое удаление (soft delete).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "64abc...",
    "clientId": "uuid...",
    "isDeleted": true,
    "deletedAt": "2024-01-15T15:00:00Z"
  }
}
```

**Idempotency:** Повторный DELETE на уже удалённый ресурс возвращает 200 (не 404).

---

## Sync Endpoint

### POST /sync

Пакетная синхронизация накопленных offline изменений.

**Принципы:**
- Обрабатывает массив операций за один запрос
- Каждая операция обрабатывается независимо (partial success)
- Весь запрос идемпотентен: повторная отправка того же `operationId` ничего не делает

**Request:**
```json
{
  "operations": [
    {
      "operationId": "op-uuid-1",
      "type": "CREATE",
      "payload": {
        "clientId": "reminder-uuid-1",
        "title": "Meeting prep",
        "dueDate": "2024-01-20T09:00:00Z",
        "priority": "high",
        "tags": ["work"]
      }
    },
    {
      "operationId": "op-uuid-2",
      "type": "UPDATE",
      "payload": {
        "clientId": "reminder-uuid-2",
        "title": "Updated title",
        "version": 3,
        "updatedAt": "2024-01-15T14:00:00Z"
      }
    },
    {
      "operationId": "op-uuid-3",
      "type": "DELETE",
      "payload": {
        "clientId": "reminder-uuid-3"
      }
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
      {
        "operationId": "op-uuid-1",
        "status": "created",
        "reminder": { "id": "64abc...", "clientId": "reminder-uuid-1", "version": 1 }
      },
      {
        "operationId": "op-uuid-2",
        "status": "updated",
        "reminder": { "id": "64def...", "clientId": "reminder-uuid-2", "version": 4 }
      },
      {
        "operationId": "op-uuid-2",
        "status": "conflict_resolved",
        "reminder": { /* серверная версия */ },
        "conflictDetails": { "winner": "server", "reason": "updatedAt" }
      },
      {
        "operationId": "op-uuid-3",
        "status": "deleted"
      }
    ],
    "syncedAt": "2024-01-15T14:30:05Z",
    "serverReminders": [
      /* Все актуальные напоминания с сервера для полного merge */
    ]
  }
}
```

**Статусы операций:**
| Status | Описание |
|---|---|
| `created` | Успешно создано |
| `updated` | Успешно обновлено |
| `deleted` | Успешно удалено |
| `skipped` | operationId уже обрабатывался (idempotency) |
| `conflict_resolved` | Конфликт разрешён (сервер победил) |
| `error` | Ошибка при обработке (с деталями) |

---

## Push Notifications Endpoints

### POST /push/subscribe

Сохранить push subscription пользователя.

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response 201:**
```json
{ "success": true, "data": { "subscribed": true } }
```

### DELETE /push/subscribe

Удалить push subscription.

---

## Rate Limiting

| Endpoint | Лимит |
|---|---|
| `POST /auth/login` | 5 req/15min per IP |
| `POST /auth/register` | 3 req/hour per IP |
| `POST /sync` | 30 req/min per user |
| Все остальные | 100 req/min per user |

---

## Retry-Safe подход

Все мутирующие операции безопасны для повторной отправки:

1. **CREATE** — использует `clientId` как idempotency key. Дубль не создаётся.
2. **UPDATE** — использует `version` для optimistic locking. При повторе — та же версия вернёт тот же результат.
3. **DELETE** — повторный DELETE возвращает 200, не 404.
4. **POST /sync** — каждая операция имеет `operationId`. Повторно обработанные помечаются как `skipped`.
