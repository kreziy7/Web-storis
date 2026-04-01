# ЭТАП 8 — PWA

## manifest.json

```json
// client/public/manifest.json
{
  "name": "Smart Reminder",
  "short_name": "Reminders",
  "description": "Offline-first reminder app with sync",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/main.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Reminder list"
    }
  ],
  "categories": ["productivity", "utilities"]
}
```

---

## Service Worker (Workbox)

```typescript
// client/service-worker/sw.ts

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// === Precaching ===
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// === Cache Names ===
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';
const IMAGES_CACHE = 'images-v1';

// === Стратегии ===

// 1. Static assets (JS, CSS, fonts) — Cache First
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 дней
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 2. Images — Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: IMAGES_CACHE,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// 3. API запросы — Network First с Background Sync fallback
const bgSyncPlugin = new BackgroundSyncPlugin('syncQueue', {
  maxRetentionTime: 24 * 60, // 24 часа (в минутах)
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }), // 5 минут
    ],
  }),
  'GET'
);

// Мутирующие API запросы — Background Sync при offline
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// 4. Navigation (HTML страницы) — Network First с offline fallback
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  )
);

// === Push Notifications ===
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'reminder',
      data: {
        reminderId: data.reminderId,
        url: data.url || '/',
      },
      actions: [
        { action: 'complete', title: 'Mark Complete' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const { action, notification } = event;
  const { reminderId, url } = notification.data;

  if (action === 'complete') {
    // Отправляем сообщение в main thread для обновления reminder
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'REMINDER_COMPLETE',
            reminderId,
          });
        }
      })
    );
  } else {
    // Открываем/фокусируем приложение
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        const existingClient = clients.find(c => c.url === url);
        if (existingClient) {
          return existingClient.focus();
        }
        return self.clients.openWindow(url);
      })
    );
  }
});

// === Sync Event (Background Sync API) ===
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});
```

---

## vite.config.ts — PWA конфигурация

```typescript
// client/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Service worker в отдельном файле
      srcDir: 'service-worker',
      filename: 'sw.ts',
      strategies: 'injectManifest',

      manifest: false, // Используем собственный manifest.json

      injectManifest: {
        swSrc: 'service-worker/sw.ts',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },

      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## PWA Installation Handler

```typescript
// client/src/shared/hooks/usePWAInstall.ts

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return { canInstall: !!installPrompt, isInstalled, promptInstall };
}
```

---

## Offline Fallback Page

```html
<!-- client/public/offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — Smart Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #334155;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #64748b; text-align: center; max-width: 300px; }
    button {
      margin-top: 24px;
      padding: 12px 24px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="icon">📵</div>
  <h1>You're offline</h1>
  <p>Smart Reminder works offline. Your changes are saved locally and will sync when you reconnect.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
```
