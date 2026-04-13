import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// ── Firebase init inside SW ───────────────────────────────
const firebaseApp = initializeApp({
    apiKey:            'AIzaSyBvl1FXO1gzm1-6vB7_3K2rkXAm02kAcso',
    authDomain:        'smart-reminder-67da6.firebaseapp.com',
    projectId:         'smart-reminder-67da6',
    storageBucket:     'smart-reminder-67da6.firebasestorage.app',
    messagingSenderId: '100592909854',
    appId:             '1:100592909854:web:97bc25e4867dd6526ab80f',
});
const messaging = getMessaging(firebaseApp);

// Handle FCM background messages (tab closed)
onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || '⏰ Reminder';
    const body  = payload.notification?.body  || payload.data?.body  || 'Your reminder is due!';
    self.registration.showNotification(title, {
        body,
        icon:  '/icon-192.png',
        badge: '/icon-192.png',
        tag:   'fcm-reminder',
        renotify: true,
        data: { url: '/' },
    });
});

// ── Precache all build assets ─────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.clients.claim();

// ── Runtime: API → NetworkFirst ───────────────────────────
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// ── Runtime: Images → CacheFirst ─────────────────────────
registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 2592000 }),
        ],
    })
);

// ── Push notifications (from backend VAPID) ───────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let data = {};
    try { data = event.data.json(); } catch { data = { title: event.data.text() }; }

    event.waitUntil(
        self.registration.showNotification(data.title || '⏰ Reminder', {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: data.tag || 'reminder',
            renotify: true,
            data: { url: data.url || '/' },
        })
    );
});

// ── Notification click ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const existing = list.find(c => c.url.includes(targetUrl) && 'focus' in c);
            if (existing) return existing.focus();
            return clients.openWindow(targetUrl);
        })
    );
});

// ── Scheduled local notifications via TimestampTrigger ────
// Main app sends reminders → SW schedules them (Chrome 80+)
self.addEventListener('message', (event) => {
    if (event.data?.type !== 'SCHEDULE_REMINDERS') return;

    const reminders = event.data.reminders || [];
    const now = Date.now();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    reminders.forEach((r) => {
        if (!r.dueDate || r.isCompleted || r.isDeleted) return;
        const dueTime = new Date(r.dueDate).getTime();
        const delay = dueTime - now;
        if (delay <= 0 || delay > WEEK_MS) return;

        // TimestampTrigger — Chrome 80+, works even when browser is closed
        const options = {
            body: r.description || 'Your reminder is due!',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `reminder-${r.clientId || r.id}`,
            renotify: true,
            data: { url: '/' },
        };

        if ('TimestampTrigger' in self) {
            // Schedule notification to fire at exact time
            options.showTrigger = new TimestampTrigger(dueTime);
            self.registration.showNotification(`⏰ ${r.title}`, options)
                .catch(() => {}); // Silently ignore if already scheduled
        }
        // Fallback handled in main thread (useNotifications.js setTimeout)
    });
});
