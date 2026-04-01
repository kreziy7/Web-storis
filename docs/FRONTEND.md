# ЭТАП 5 — FRONTEND CORE

## Zustand Store Architecture

Используем **Zustand** с разделением на слайсы (slice pattern):

### authStore.ts

```typescript
// client/src/features/auth/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/authApi';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, accessToken } = await authApi.login({ email, password });
          set({ user, accessToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const { user, accessToken } = await authApi.register({ email, password, name });
          set({ user, accessToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        await authApi.logout();
        set({ user: null, accessToken: null });
      },

      setAccessToken: (token) => set({ accessToken: token }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // accessToken НЕ персистируем
    }
  )
);
```

---

### reminderStore.ts

```typescript
// client/src/features/reminders/store/reminderStore.ts

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { remindersApi } from '../api/remindersApi';
import { remindersDb } from '@/db/remindersDb';
import { syncQueueDb } from '@/db/syncQueueDb';
import type { Reminder, CreateReminderDto, UpdateReminderDto } from '@/types/reminder';

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  fetchReminders: () => Promise<void>;
  createReminder: (dto: CreateReminderDto) => Promise<void>;
  updateReminder: (id: string, dto: UpdateReminderDto) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  setReminders: (reminders: Reminder[]) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  // Загрузка: сначала из IndexedDB, потом обновляем с сервера
  fetchReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Загружаем из локальной БД (мгновенно)
      const localReminders = await remindersDb.getAll();
      set({ reminders: localReminders.filter(r => !r.isDeleted) });

      // 2. Запрашиваем с сервера (если онлайн)
      if (navigator.onLine) {
        const serverReminders = await remindersApi.getAll();
        await remindersDb.bulkPut(serverReminders.map(r => ({ ...r, isSynced: true })));
        set({ reminders: serverReminders.filter(r => !r.isDeleted) });
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Optimistic create
  createReminder: async (dto) => {
    const clientId = uuidv4();
    const newReminder: Reminder = {
      id: clientId,
      clientId,
      ...dto,
      isCompleted: false,
      version: 1,
      isSynced: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    set(state => ({ reminders: [newReminder, ...state.reminders] }));

    // Сохраняем локально
    await remindersDb.put(newReminder);

    if (navigator.onLine) {
      try {
        const created = await remindersApi.create({ clientId, ...dto });
        const synced = { ...newReminder, ...created, isSynced: true };
        await remindersDb.put(synced);
        set(state => ({
          reminders: state.reminders.map(r => r.clientId === clientId ? synced : r)
        }));
      } catch {
        // Не синхронизировано — добавляем в queue
        await syncQueueDb.add({ type: 'CREATE', clientId, payload: newReminder });
      }
    } else {
      await syncQueueDb.add({ type: 'CREATE', clientId, payload: newReminder });
    }
  },

  // Optimistic update
  updateReminder: async (clientId, dto) => {
    const current = get().reminders.find(r => r.clientId === clientId);
    if (!current) return;

    const updated: Reminder = {
      ...current,
      ...dto,
      version: current.version + 1,
      isSynced: false,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    set(state => ({
      reminders: state.reminders.map(r => r.clientId === clientId ? updated : r)
    }));
    await remindersDb.put(updated);

    if (navigator.onLine) {
      try {
        const serverResult = await remindersApi.update(clientId, dto);
        const synced = { ...updated, ...serverResult, isSynced: true };
        await remindersDb.put(synced);
        set(state => ({
          reminders: state.reminders.map(r => r.clientId === clientId ? synced : r)
        }));
      } catch {
        await syncQueueDb.addOrMerge({ type: 'UPDATE', clientId, payload: updated });
      }
    } else {
      await syncQueueDb.addOrMerge({ type: 'UPDATE', clientId, payload: updated });
    }
  },

  // Optimistic delete (soft)
  deleteReminder: async (clientId) => {
    // Optimistic remove from UI
    set(state => ({
      reminders: state.reminders.filter(r => r.clientId !== clientId)
    }));

    const deletedAt = new Date().toISOString();
    await remindersDb.softDelete(clientId, deletedAt);

    if (navigator.onLine) {
      try {
        await remindersApi.delete(clientId);
        await remindersDb.remove(clientId);
      } catch {
        await syncQueueDb.addOrMerge({ type: 'DELETE', clientId, payload: { deletedAt } });
      }
    } else {
      await syncQueueDb.addOrMerge({ type: 'DELETE', clientId, payload: { deletedAt } });
    }
  },

  setReminders: (reminders) => set({ reminders }),
}));
```

---

## API Layer

### axios.ts — HTTP Client с interceptors

```typescript
// client/src/api/axios.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL;

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // для refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: добавляем access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh token при 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Key Components

### ReminderList.tsx

```typescript
// client/src/features/reminders/components/ReminderList.tsx

import React from 'react';
import { useReminderStore } from '../store/reminderStore';
import { ReminderCard } from './ReminderCard';
import { useSyncStore } from '@/store/syncStore';

export const ReminderList: React.FC = () => {
  const { reminders, isLoading, error, fetchReminders } = useReminderStore();
  const { isSyncing, pendingCount } = useSyncStore();

  React.useEffect(() => {
    fetchReminders();
  }, []);

  if (isLoading && reminders.length === 0) {
    return <div className="loading-spinner">Loading reminders...</div>;
  }

  if (error) {
    return (
      <div className="error-banner">
        <p>{error}</p>
        <button onClick={fetchReminders}>Retry</button>
      </div>
    );
  }

  return (
    <div className="reminder-list">
      {/* Sync status banner */}
      {pendingCount > 0 && (
        <div className={`sync-banner ${isSyncing ? 'syncing' : 'pending'}`}>
          {isSyncing
            ? `Syncing ${pendingCount} changes...`
            : `${pendingCount} changes pending sync`}
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="empty-state">
          <p>No reminders yet. Create your first one!</p>
        </div>
      ) : (
        reminders.map(reminder => (
          <ReminderCard key={reminder.clientId} reminder={reminder} />
        ))
      )}
    </div>
  );
};
```

### ReminderCard.tsx

```typescript
// client/src/features/reminders/components/ReminderCard.tsx

import React, { useState } from 'react';
import { useReminderStore } from '../store/reminderStore';
import type { Reminder } from '@/types/reminder';
import { format } from 'date-fns';

interface Props {
  reminder: Reminder;
}

export const ReminderCard: React.FC<Props> = ({ reminder }) => {
  const { updateReminder, deleteReminder } = useReminderStore();
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleComplete = () => {
    updateReminder(reminder.clientId, { isCompleted: !reminder.isCompleted });
  };

  const handleDelete = () => {
    if (confirm('Delete this reminder?')) {
      deleteReminder(reminder.clientId);
    }
  };

  return (
    <div className={`reminder-card priority-${reminder.priority} ${reminder.isCompleted ? 'completed' : ''}`}>
      <div className="reminder-header">
        <input
          type="checkbox"
          checked={reminder.isCompleted}
          onChange={handleToggleComplete}
        />
        <h3 className="reminder-title">{reminder.title}</h3>
        {!reminder.isSynced && (
          <span className="sync-indicator" title="Not synced">⏳</span>
        )}
      </div>

      {reminder.description && (
        <p className="reminder-description">{reminder.description}</p>
      )}

      <div className="reminder-footer">
        <span className="due-date">
          {format(new Date(reminder.dueDate), 'MMM dd, yyyy HH:mm')}
        </span>
        <span className={`priority-badge ${reminder.priority}`}>
          {reminder.priority}
        </span>
        <div className="reminder-actions">
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button onClick={handleDelete} className="delete-btn">Delete</button>
        </div>
      </div>
    </div>
  );
};
```

---

## syncStore.ts — Состояние синхронизации

```typescript
// client/src/store/syncStore.ts

import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncError: string | null;
  setIsSyncing: (value: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (timestamp: string) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncError: null,
  setIsSyncing: (value) => set({ isSyncing: value }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncError: (error) => set({ syncError: error }),
}));
```
