# 04 — Нефункциональные требования

> [← Индекс](./00_INDEX.md)

---

## Производительность

| Метрика | Требование |
|---|---|
| Time to Interactive (offline) | < 1 секунды (данные из IndexedDB) |
| Optimistic UI отклик | < 50 мс (локальное обновление) |
| Batch sync размер | до 100 операций за один запрос |
| Пагинация API | max 100 записей на страницу |

---

## Надёжность

- Retry механизм с exponential backoff при ошибках сети
- Partial success в batch sync — неудачная операция не блокирует остальные
- Idempotency — повторная отправка операций не создаёт дублей
- Soft delete — данные физически не удаляются

---

## Масштабируемость

- MongoDB indexed queries (userId, dueDate, clientId+userId)
- Инкрементальная синхронизация через параметр `?since=<ISO>`
- Пагинация на всех list-endpoints

---

## Наблюдаемость

- HTTP request logging: метод, URL, статус, duration, userId
- Ошибки сервера: stack trace в `logs/error.log`
- Ротация логов: 5 файлов по 10 MB
- Эндпоинт `GET /health` для мониторинга uptime
