# 03 — Функциональные требования

> [← Индекс](./00_INDEX.md)

---

## 3.1 Аутентификация

| ID | Требование | Приоритет |
|---|---|---|
| AUTH-01 | Регистрация по email и паролю | Must |
| AUTH-02 | Вход в систему | Must |
| AUTH-03 | Выход (инвалидация refresh token) | Must |
| AUTH-04 | Автоматическое обновление access token через refresh token | Must |
| AUTH-05 | Refresh token хранится в httpOnly cookie | Must |
| AUTH-06 | Access token хранится в памяти (не в localStorage) | Must |

**Валидация при регистрации:**

| Поле | Правило |
|---|---|
| `email` | Валидный формат, уникальный |
| `password` | Мин. 8 символов, 1 заглавная, 1 цифра, 1 спецсимвол |
| `name` | 2–50 символов |

---

## 3.2 Управление напоминаниями (CRUD)

| ID | Требование | Приоритет |
|---|---|---|
| REM-01 | Создание напоминания | Must |
| REM-02 | Просмотр списка с фильтрацией и сортировкой | Must |
| REM-03 | Редактирование напоминания | Must |
| REM-04 | Удаление напоминания (soft delete) | Must |
| REM-05 | Отметка как выполненного (checkbox) | Must |
| REM-06 | Фильтрация по статусу и приоритету | Should |
| REM-07 | Сортировка по dueDate / createdAt / updatedAt | Should |

**Поля напоминания:**

| Поле | Тип | Ограничения |
|---|---|---|
| `title` | string | required, max 200 символов |
| `description` | string | optional, max 2000 символов |
| `dueDate` | ISO 8601 | required |
| `priority` | enum | `low` / `medium` / `high`, default `medium` |
| `tags` | string[] | optional, max 20 тегов |
| `isCompleted` | boolean | default `false` |

---

## 3.3 Offline-first

| ID | Требование | Приоритет |
|---|---|---|
| OFF-01 | Все CRUD операции доступны без интернета | Must |
| OFF-02 | Изменения накапливаются в syncQueue при offline | Must |
| OFF-03 | Автоматический sync при восстановлении сети | Must |
| OFF-04 | Индикатор количества несинхронизированных изменений в UI | Must |
| OFF-05 | Разрешение конфликтов при синхронизации | Must |
| OFF-06 | Пакетная (batch) отправка накопленных операций | Must |

---

## 3.4 Push-уведомления

| ID | Требование | Приоритет |
|---|---|---|
| PUSH-01 | Запрос разрешения у пользователя | Must |
| PUSH-02 | Подписка через Web Push API (VAPID) | Must |
| PUSH-03 | Уведомление за N минут до dueDate | Must |
| PUSH-04 | Отмена подписки | Should |

---

## 3.5 PWA

| ID | Требование | Приоритет |
|---|---|---|
| PWA-01 | Устанавливается через браузер (Add to Home Screen) | Must |
| PWA-02 | Offline fallback страница | Must |
| PWA-03 | Кеширование статических ресурсов | Must |
| PWA-04 | Network-First стратегия для API | Must |
| PWA-05 | Web App Manifest с иконками 192×192 и 512×512 | Must |
| PWA-06 | Service Worker обновляется при деплое | Must |
