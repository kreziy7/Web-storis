# 13 — Push-уведомления

> [← Индекс](./00_INDEX.md)

---

## VAPID ключи

- Генерация: `webpush.generateVAPIDKeys()`
- **Public key** — передаётся клиенту через `VITE_VAPID_PUBLIC_KEY`
- **Private key** — только на сервере, никогда не передаётся клиенту

---

## Подписка на клиенте

```typescript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VITE_VAPID_PUBLIC_KEY)
});

// Отправить subscription на сервер
await pushApi.subscribe(subscription);
```

Подписка сохраняется в `User.pushSubscriptions[]` в MongoDB.

---

## Отправка уведомлений (сервер)

Scheduled task / cron job:

```
Каждую минуту:
  1. Найти reminders где:
     - dueDate ∈ [now, now + N минут]
     - notified: false
     - isDeleted: false
  2. Для каждого: получить pushSubscriptions пользователя
  3. webpush.sendNotification(subscription, payload)
  4. Обновить reminder: { notified: true }
```

---

## Payload уведомления

```json
{
  "title": "Reminder: Buy groceries",
  "body": "Due in 15 minutes",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/badge-72.png",
  "data": {
    "reminderId": "64abc...",
    "url": "/"
  }
}
```

---

## Обработка в Service Worker

```typescript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

---

## Обработка ошибок доставки

- `410 Gone` от push service → удалить подписку из MongoDB
- `404 Not Found` → удалить подписку из MongoDB
- Другие ошибки → логировать, повторить при следующем запуске
