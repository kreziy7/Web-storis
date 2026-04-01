# ЭТАП 7 — SYNC ENGINE

## Архитектура Sync Engine

```
┌──────────────────────────────────────────────────┐
│                  SYNC ENGINE                      │
│                                                  │
│  NetworkMonitor                                  │
│       │ (online event)                           │
│       ▼                                          │
│  SyncOrchestrator.sync()                         │
│       │                                          │
│       ├── 1. Read syncQueue (ordered by time)    │
│       ├── 2. Deduplicate operations              │
│       ├── 3. Build batch payload                 │
│       ├── 4. POST /sync                          │
│       ├── 5. Process server response             │
│       │       ├── Conflict resolution            │
│       │       └── Update IndexedDB               │
│       └── 6. Clear processed queue items         │
└──────────────────────────────────────────────────┘
```

---

## syncEngine.ts — Главный оркестратор

```typescript
// client/src/sync/syncEngine.ts

import { syncQueueDb } from '@/db/syncQueueDb';
import { remindersDb } from '@/db/remindersDb';
import { metaDb } from '@/db/metaDb';
import { apiClient } from '@/api/axios';
import { conflictResolver } from './conflictResolver';
import { networkMonitor } from './networkMonitor';
import { useSyncStore } from '@/store/syncStore';
import { useReminderStore } from '@/features/reminders/store/reminderStore';
import { withRetry } from './retry';
import type { ISyncQueueItem } from '@/db/schema';

const MAX_BATCH_SIZE = 50;
const MAX_RETRIES_PER_OPERATION = 3;

class SyncEngine {
  private isSyncing = false;

  constructor() {
    // Подписываемся на восстановление сети
    networkMonitor.subscribe((isOnline) => {
      if (isOnline) {
        this.triggerSync();
      }
    });

    // Периодическая синхронизация (каждые 5 минут если онлайн)
    setInterval(() => {
      if (networkMonitor.isOnline) {
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  // Запуск синхронизации (с защитой от параллельного запуска)
  async triggerSync(): Promise<void> {
    if (this.isSyncing) return;

    const pendingCount = await syncQueueDb.count();
    if (pendingCount === 0) return;

    this.isSyncing = true;
    useSyncStore.getState().setIsSyncing(true);
    useSyncStore.getState().setSyncError(null);

    try {
      await this.sync();
    } catch (error: any) {
      useSyncStore.getState().setSyncError(error.message);
    } finally {
      this.isSyncing = false;
      useSyncStore.getState().setIsSyncing(false);

      const remaining = await syncQueueDb.count();
      useSyncStore.getState().setPendingCount(remaining);
    }
  }

  private async sync(): Promise<void> {
    // 1. Получаем все операции в хронологическом порядке
    const allOperations = await syncQueueDb.getAll();

    // 2. Фильтруем операции с превышенным лимитом retry
    const validOperations = allOperations.filter(op => op.retryCount < MAX_RETRIES_PER_OPERATION);
    const failedOperations = allOperations.filter(op => op.retryCount >= MAX_RETRIES_PER_OPERATION);

    if (failedOperations.length > 0) {
      console.warn(`[SyncEngine] ${failedOperations.length} operations exceeded retry limit, skipping`);
    }

    if (validOperations.length === 0) return;

    // 3. Обрабатываем батчами
    for (let i = 0; i < validOperations.length; i += MAX_BATCH_SIZE) {
      const batch = validOperations.slice(i, i + MAX_BATCH_SIZE);
      await this.processBatch(batch);
    }

    // 4. Обновляем метаданные
    await metaDb.setLastSyncAt(Date.now());
    useSyncStore.getState().setLastSyncAt(new Date().toISOString());
  }

  private async processBatch(operations: ISyncQueueItem[]): Promise<void> {
    const payload = {
      operations: operations.map(op => ({
        operationId: op.operationId,
        type: op.type,
        payload: op.payload,
      })),
      clientTimestamp: new Date().toISOString(),
    };

    let response: any;

    try {
      response = await withRetry(
        () => apiClient.post('/sync', payload).then(r => r.data),
        { maxRetries: 3, initialDelay: 1000 }
      );
    } catch (error: any) {
      // Инкрементируем retry counter для всех операций в батче
      for (const op of operations) {
        await syncQueueDb.incrementRetry(op.operationId, error.message);
      }
      throw error;
    }

    // 5. Обрабатываем результаты
    await this.processResults(response.data.results, operations);

    // 6. Применяем серверные напоминания если есть
    if (response.data.serverReminders?.length > 0) {
      await this.mergeServerReminders(response.data.serverReminders);
    }
  }

  private async processResults(
    results: any[],
    operations: ISyncQueueItem[]
  ): Promise<void> {
    const successfulOpIds: string[] = [];

    for (const result of results) {
      const operation = operations.find(op => op.operationId === result.operationId);
      if (!operation) continue;

      switch (result.status) {
        case 'created':
        case 'updated':
        case 'deleted':
        case 'skipped':
          // Успех — обновляем локальную запись
          if (result.reminder) {
            const current = await remindersDb.get(result.reminder.clientId);
            if (current) {
              await remindersDb.put({
                ...current,
                ...result.reminder,
                serverId: result.reminder.id,
                isSynced: true,
              });
            }
          }
          if (result.status === 'deleted') {
            await remindersDb.remove(operation.clientId);
          }
          successfulOpIds.push(result.operationId);
          break;

        case 'conflict_resolved':
          // Конфликт разрешён — применяем серверную версию
          if (result.reminder) {
            const resolved = await conflictResolver.applyServerVersion(
              result.reminder,
              operation.payload
            );
            await remindersDb.put({ ...resolved, isSynced: true });

            // Обновляем UI
            const reminders = await remindersDb.getAll();
            useReminderStore.getState().setReminders(
              reminders.filter(r => !r.isDeleted)
            );
          }
          successfulOpIds.push(result.operationId);
          break;

        case 'error':
          console.error(`[SyncEngine] Operation ${result.operationId} failed:`, result.error);
          await syncQueueDb.incrementRetry(result.operationId, result.error);
          break;
      }
    }

    // Удаляем успешно обработанные операции
    if (successfulOpIds.length > 0) {
      await syncQueueDb.removeMany(successfulOpIds);
    }
  }

  private async mergeServerReminders(serverReminders: any[]): Promise<void> {
    for (const serverReminder of serverReminders) {
      const local = await remindersDb.get(serverReminder.clientId);

      if (!local) {
        // Новая запись с сервера — добавляем локально
        await remindersDb.put({
          ...serverReminder,
          id: serverReminder.clientId,
          serverId: serverReminder.id,
          isSynced: true,
        });
      } else if (!local.isSynced) {
        // Локальные изменения ожидают sync — не перезаписываем
        continue;
      } else {
        // Обновляем если серверная версия новее
        const serverNewer = new Date(serverReminder.updatedAt) > new Date(local.updatedAt);
        if (serverNewer) {
          await remindersDb.put({
            ...local,
            ...serverReminder,
            id: serverReminder.clientId,
            serverId: serverReminder.id,
            isSynced: true,
          });
        }
      }
    }

    // Обновляем UI
    const allLocal = await remindersDb.getAll();
    useReminderStore.getState().setReminders(allLocal.filter(r => !r.isDeleted));
  }
}

export const syncEngine = new SyncEngine();
```

---

## conflictResolver.ts — Разрешение конфликтов

```typescript
// client/src/sync/conflictResolver.ts

import type { ILocalReminder } from '@/db/schema';

type ConflictWinner = 'server' | 'client';

interface ConflictResult {
  winner: ConflictWinner;
  resolved: ILocalReminder;
  reason: string;
}

class ConflictResolver {

  // Основной метод разрешения конфликта
  resolve(
    client: Partial<ILocalReminder>,
    server: Partial<ILocalReminder>
  ): ConflictResult {
    const clientTime = client.updatedAt ? new Date(client.updatedAt).getTime() : 0;
    const serverTime = server.updatedAt ? new Date(server.updatedAt).getTime() : 0;

    // Last-Write-Wins по updatedAt
    if (serverTime >= clientTime) {
      return {
        winner: 'server',
        resolved: server as ILocalReminder,
        reason: `Server updatedAt (${server.updatedAt}) >= Client updatedAt (${client.updatedAt})`,
      };
    } else {
      return {
        winner: 'client',
        resolved: client as ILocalReminder,
        reason: `Client updatedAt (${client.updatedAt}) > Server updatedAt (${server.updatedAt})`,
      };
    }
  }

  // Применяем серверную версию как source of truth
  async applyServerVersion(
    serverReminder: any,
    clientPayload: Partial<ILocalReminder>
  ): Promise<ILocalReminder> {
    const result = this.resolve(clientPayload, serverReminder);

    console.debug(
      `[ConflictResolver] Conflict resolved: winner=${result.winner}, reason=${result.reason}`
    );

    return {
      ...result.resolved,
      id: serverReminder.clientId || result.resolved.id,
      serverId: serverReminder.id,
      isSynced: true,
    };
  }
}

export const conflictResolver = new ConflictResolver();
```

---

## Server-side Sync Logic

### sync.service.ts

```typescript
// server/src/services/sync.service.ts

import { Reminder } from '../models/Reminder.model';
import type { IReminder } from '../models/Reminder.model';

interface SyncOperation {
  operationId: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Partial<IReminder> & { clientId: string };
}

interface SyncResult {
  operationId: string;
  status: 'created' | 'updated' | 'deleted' | 'skipped' | 'conflict_resolved' | 'error';
  reminder?: IReminder;
  conflictDetails?: object;
  error?: string;
}

export class SyncService {

  async processBatch(
    operations: SyncOperation[],
    userId: string
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const operation of operations) {
      try {
        const result = await this.processOperation(operation, userId);
        results.push(result);
      } catch (error: any) {
        results.push({
          operationId: operation.operationId,
          status: 'error',
          error: error.message,
        });
      }
    }

    return results;
  }

  private async processOperation(
    operation: SyncOperation,
    userId: string
  ): Promise<SyncResult> {
    switch (operation.type) {
      case 'CREATE':
        return this.handleCreate(operation, userId);
      case 'UPDATE':
        return this.handleUpdate(operation, userId);
      case 'DELETE':
        return this.handleDelete(operation, userId);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async handleCreate(op: SyncOperation, userId: string): Promise<SyncResult> {
    // Idempotency: проверяем существование по clientId
    const existing = await Reminder.findOne({
      clientId: op.payload.clientId,
      userId,
    });

    if (existing) {
      return {
        operationId: op.operationId,
        status: 'skipped',
        reminder: existing.toObject(),
      };
    }

    const created = await Reminder.create({
      ...op.payload,
      userId,
      version: 1,
      isSynced: true,
    });

    return {
      operationId: op.operationId,
      status: 'created',
      reminder: created.toObject(),
    };
  }

  private async handleUpdate(op: SyncOperation, userId: string): Promise<SyncResult> {
    const server = await Reminder.findOne({
      clientId: op.payload.clientId,
      userId,
      isDeleted: false,
    });

    if (!server) {
      // Запись не найдена — создаём (может быть удалена и пересоздана)
      return this.handleCreate({ ...op, type: 'CREATE' }, userId);
    }

    // Conflict detection
    const clientVersion = op.payload.version ?? 0;
    const serverVersion = server.version;

    if (clientVersion < serverVersion) {
      // Конфликт версий — применяем last-write-wins
      const clientTime = op.payload.updatedAt ? new Date(op.payload.updatedAt).getTime() : 0;
      const serverTime = server.updatedAt.getTime();

      if (serverTime >= clientTime) {
        // Сервер выиграл
        return {
          operationId: op.operationId,
          status: 'conflict_resolved',
          reminder: server.toObject(),
          conflictDetails: {
            winner: 'server',
            clientVersion,
            serverVersion,
            reason: 'server updatedAt is newer',
          },
        };
      }
    }

    // Применяем обновление клиента
    const updated = await Reminder.findByIdAndUpdate(
      server._id,
      {
        ...op.payload,
        version: serverVersion + 1,
        updatedAt: new Date(),
      },
      { new: true }
    );

    return {
      operationId: op.operationId,
      status: 'updated',
      reminder: updated!.toObject(),
    };
  }

  private async handleDelete(op: SyncOperation, userId: string): Promise<SyncResult> {
    const reminder = await Reminder.findOne({
      clientId: op.payload.clientId,
      userId,
    });

    if (!reminder) {
      // Уже удалено — идемпотентный ответ
      return { operationId: op.operationId, status: 'deleted' };
    }

    await Reminder.findByIdAndUpdate(reminder._id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return { operationId: op.operationId, status: 'deleted' };
  }

  // Возвращаем актуальное состояние сервера для full merge
  async getServerReminders(userId: string): Promise<IReminder[]> {
    return Reminder.find({ userId, isDeleted: false })
      .sort({ updatedAt: -1 })
      .lean();
  }
}

export const syncService = new SyncService();
```
