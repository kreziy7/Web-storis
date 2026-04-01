# 09 — Frontend — детальные требования

> [← Индекс](./00_INDEX.md)

---

## Маршруты (React Router)

| Путь | Компонент | Доступ |
|---|---|---|
| `/login` | LoginForm | Публичный |
| `/register` | RegisterForm | Публичный |
| `/` | ReminderList | Приватный |
| `/reminders/new` | ReminderForm | Приватный |
| `/reminders/:id/edit` | ReminderForm | Приватный |

---

## Zustand Stores

### authStore

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;  // НЕ персистируется в localStorage
  isLoading: boolean;
  error: string | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name: string): Promise<void>;
  logout(): Promise<void>;
  setAccessToken(token: string): void;
  clearError(): void;
}
```

Персистируется через `zustand/middleware persist` — только `user`, **не** `accessToken`.

---

### reminderStore

```typescript
interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  fetchReminders(): Promise<void>;      // IndexedDB сначала, затем сервер
  createReminder(dto: CreateReminderDto): Promise<void>;  // Optimistic
  updateReminder(id: string, dto: UpdateReminderDto): Promise<void>;  // Optimistic
  deleteReminder(id: string): Promise<void>;  // Optimistic
  setReminders(reminders: Reminder[]): void;
}
```

**Логика fetchReminders:**
1. Загружаем из IndexedDB → показываем мгновенно
2. Если `navigator.onLine` — запрашиваем с сервера `?since=lastSyncAt`
3. Обновляем IndexedDB и store

---

### syncStore

```typescript
interface SyncState {
  isSyncing: boolean;
  pendingCount: number;      // количество операций в syncQueue
  lastSyncAt: string | null;
  syncError: string | null;
  setIsSyncing(value: boolean): void;
  setPendingCount(count: number): void;
  setLastSyncAt(timestamp: string): void;
  setSyncError(error: string | null): void;
}
```

---

## Axios Interceptors

### Request interceptor

Добавляет `Authorization: Bearer <accessToken>` к каждому запросу.

### Response interceptor — Auto Token Refresh

При `401` ответе:
1. Если токен ещё не обновляется — запускает `POST /auth/refresh`
2. Если уже обновляется — помещает запрос в очередь
3. После успешного refresh — повторяет все запросы из очереди
4. При ошибке refresh — вызывает `logout()`

---

## Компоненты

| Компонент | Описание |
|---|---|
| `LoginForm` | Форма входа с валидацией |
| `RegisterForm` | Форма регистрации |
| `ReminderList` | Список с sync status banner |
| `ReminderCard` | Карточка: checkbox, edit, delete, sync indicator (⏳) |
| `ReminderForm` | Форма создания и редактирования |
| `ReminderFilters` | Фильтры (статус, приоритет) и сортировка |
| `NetworkStatus` | Индикатор online / offline |
| `Toast` | Всплывающие уведомления об успехе / ошибке |
| `Modal` | Диалоги подтверждения |

---

## Hooks

| Hook | Описание |
|---|---|
| `useNetworkStatus` | Подписка на события `online` / `offline` |
| `useDebounce` | Дебаунс для поисковых input полей |
| `useAuth` | Обёртка над authStore |
| `useReminders` | Обёртка над reminderStore |
| `useNotifications` | Управление push-подпиской |
