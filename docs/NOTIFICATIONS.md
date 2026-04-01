# ЭТАП 9 — NOTIFICATIONS

## Local Notifications

### useNotifications.ts

```typescript
// client/src/features/notifications/hooks/useNotifications.ts

import { useEffect, useCallback } from 'react';
import { useReminderStore } from '@/features/reminders/store/reminderStore';

export function useNotifications() {
  const { reminders } = useReminderStore();

  // Запрос разрешения на уведомления
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  // Показать локальное уведомление
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions): void => {
      if (Notification.permission !== 'granted') return;

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Через Service Worker для поддержки действий (actions)
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            ...options,
          });
        });
      } else {
        // Fallback: прямое уведомление
        new Notification(title, options);
      }
    },
    []
  );

  // Планировщик напоминаний
  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    reminders.forEach(reminder => {
      if (reminder.isCompleted || reminder.isDeleted) return;

      const dueTime = new Date(reminder.dueDate).getTime();
      const now = Date.now();
      const delay = dueTime - now;

      if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) { // Только в пределах 7 дней
        const timer = setTimeout(() => {
          showNotification(`⏰ ${reminder.title}`, {
            body: reminder.description || `Due: ${new Date(reminder.dueDate).toLocaleString()}`,
            tag: `reminder-${reminder.clientId}`,
            data: { reminderId: reminder.clientId },
            requireInteraction: true,
          });
        }, delay);

        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [reminders, showNotification]);

  return { requestPermission, showNotification };
}
```

---

## Push Notifications (Web Push API)

### pushApi.ts — Клиент

```typescript
// client/src/features/notifications/api/pushApi.ts

import { apiClient } from '@/api/axios';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushApi = {
  async subscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await apiClient.post('/push/subscribe', { subscription: subscription.toJSON() });
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  },

  async unsubscribe(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await apiClient.delete('/push/subscribe');
    }
  },

  async getSubscriptionStatus(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  },
};
```

---

### push.service.ts — Сервер

```typescript
// server/src/services/push.service.ts

import webpush from 'web-push';
import { User } from '../models/User.model';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  reminderId: string;
  url?: string;
  tag?: string;
}

export class PushService {

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || user.pushSubscriptions.length === 0) return;

    const results = await Promise.allSettled(
      user.pushSubscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    // Удаляем expired subscriptions (HTTP 410 Gone)
    const expiredEndpoints = new Set<string>();
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason;
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          expiredEndpoints.add(user.pushSubscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.size > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: {
            endpoint: { $in: Array.from(expiredEndpoints) },
          },
        },
      });
    }
  }

  async sendReminderDueNotification(
    userId: string,
    reminder: { id: string; title: string; description?: string }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: `⏰ ${reminder.title}`,
      body: reminder.description || 'Your reminder is due now!',
      reminderId: reminder.id,
      url: '/',
      tag: `reminder-${reminder.id}`,
    });
  }
}

export const pushService = new PushService();
```

---

### Планировщик уведомлений (Node.js Cron)

```typescript
// server/src/services/notificationScheduler.ts

import { Reminder } from '../models/Reminder.model';
import { pushService } from './push.service';
import { logger } from '../utils/logger';

// Запускается каждую минуту
export async function checkDueReminders(): Promise<void> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneMinuteAhead = new Date(now.getTime() + 60 * 1000);

  try {
    const dueReminders = await Reminder.find({
      dueDate: { $gte: oneMinuteAgo, $lte: oneMinuteAhead },
      isCompleted: false,
      isDeleted: false,
      notified: { $ne: true }, // Не отправляли ещё
    }).populate('userId', '_id');

    for (const reminder of dueReminders) {
      await pushService.sendReminderDueNotification(
        reminder.userId.toString(),
        {
          id: reminder._id.toString(),
          title: reminder.title,
          description: reminder.description,
        }
      );

      // Помечаем как отправленное
      await Reminder.findByIdAndUpdate(reminder._id, { notified: true });
    }

    if (dueReminders.length > 0) {
      logger.info(`[Scheduler] Sent ${dueReminders.length} due notifications`);
    }
  } catch (error) {
    logger.error('[Scheduler] Error checking due reminders:', error);
  }
}

// Запуск в server.ts:
// setInterval(checkDueReminders, 60 * 1000);
```

---

## VAPID Keys Generation

```bash
# Генерация VAPID ключей (один раз при setup)
npx web-push generate-vapid-keys

# Вывод:
# Public Key: BFxTr5...
# Private Key: 7H9kL...
```
