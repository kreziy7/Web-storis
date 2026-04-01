# 05 — Технологический стек

> [← Индекс](./00_INDEX.md)

---

## Frontend

| Технология | Версия | Назначение |
|---|---|---|
| React | 18.2.0 | UI framework |
| TypeScript | 5.3.0 | Типизация |
| Vite | 5.0.0 | Build tool |
| vite-plugin-pwa | 0.17.0 | PWA / Service Worker |
| Workbox | 7.0.0 | Cache strategies |
| Zustand | 4.4.0 | State management |
| Axios | 1.6.0 | HTTP client |
| idb | 7.1.1 | IndexedDB wrapper |
| uuid | 9.0.0 | UUID генерация (clientId) |
| date-fns | 3.0.0 | Работа с датами |
| react-router-dom | 6.20.0 | Клиентский роутинг |

---

## Backend

| Технология | Версия | Назначение |
|---|---|---|
| Node.js | 20.x LTS | Runtime |
| Express | 4.18.0 | HTTP framework |
| TypeScript | 5.3.0 | Типизация |
| Mongoose | 8.0.0 | MongoDB ODM |
| jsonwebtoken | 9.0.0 | JWT access/refresh |
| bcryptjs | 2.4.3 | Хеширование паролей |
| express-validator | 7.0.0 | Валидация входных данных |
| express-rate-limit | 7.0.0 | Rate limiting |
| helmet | 7.0.0 | Security headers |
| cors | 2.8.5 | CORS |
| cookie-parser | 1.4.6 | Обработка cookies |
| web-push | 3.6.0 | Web Push уведомления |
| winston | 3.11.0 | Логирование |
| zod | 3.22.0 | Валидация env переменных |
| nodemon | 3.0.0 | Dev auto-reload |

---

## База данных

| Технология | Назначение |
|---|---|
| MongoDB 7.x | Персистентное хранилище на сервере |
| IndexedDB (idb) | Локальное хранилище на клиенте |

---

## Infrastructure

| Компонент | Описание |
|---|---|
| docker-compose.yml | MongoDB для локальной разработки |
| `.env` файлы | Конфигурация через переменные окружения |
