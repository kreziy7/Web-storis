# 12 — PWA требования

> [← Индекс](./00_INDEX.md)

---

## Web App Manifest

Файл: `/public/manifest.json`

```json
{
  "name": "Smart Reminder",
  "short_name": "Reminder",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Service Worker — Workbox стратегии

| Ресурс | Стратегия | Описание |
|---|---|---|
| JS, CSS, HTML (static) | `CacheFirst` | Закешировано при установке SW |
| API запросы `/api/*` | `NetworkFirst` | Сеть → при ошибке из cache |
| Изображения | `CacheFirst` | Долгий TTL |
| Навигация (SPA) | `NetworkFirst` | Offline fallback → `offline.html` |

---

## Offline fallback

Файл: `/public/offline.html`

Показывается Service Worker'ом при попытке навигации без сети, когда страница не в кеше.

---

## Обновление Service Worker

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    skipWaiting: true,   // активируется немедленно
    clientsClaim: true,  // захватывает все вкладки
  }
})
```

При обнаружении обновления — уведомить пользователя через Toast с кнопкой "Обновить".

---

## Lighthouse PWA Checklist

- [ ] HTTPS (или localhost)
- [ ] Web App Manifest зарегистрирован
- [ ] Service Worker зарегистрирован
- [ ] Иконки 192×192 и 512×512
- [ ] `start_url` возвращает 200 offline
- [ ] `display: standalone`
- [ ] `theme_color` задан
- [ ] Страница корректна на мобильных устройствах
- [ ] PWA score ≥ 90
