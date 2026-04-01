# Smart Reminder PWA — Production-Ready Offline-First Application

> **Full-stack production system** built with React PWA + Node.js + MongoDB + IndexedDB

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Documentation](#documentation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Features](#features)
- [Architecture Summary](#architecture-summary)

---

## Overview

**Smart Reminder PWA** — это production-ready прогрессивное веб-приложение для управления напоминаниями с полноценной offline-first архитектурой, двунаправленной синхронизацией и push-уведомлениями.

Система спроектирована так, чтобы работать **без интернета**, накапливать изменения локально и автоматически синхронизироваться при восстановлении соединения.

---

## Tech Stack

### Frontend
| Технология | Назначение |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Zustand | State management |
| idb (IndexedDB wrapper) | Offline storage |
| Workbox | Service Worker / PWA |
| Axios | HTTP client |

### Backend
| Технология | Назначение |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Persistent database |
| JWT | Authentication |
| bcryptjs | Password hashing |
| web-push | Push notifications |
| Winston | Logging |

---

## Documentation

| Файл | Описание |
|---|---|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Полная системная архитектура |
| [DATA_MODELS.md](./docs/DATA_MODELS.md) | Модели данных MongoDB + IndexedDB |
| [API_DESIGN.md](./docs/API_DESIGN.md) | REST API спецификация |
| [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) | Структура проекта |
| [FRONTEND.md](./docs/FRONTEND.md) | Frontend реализация |
| [OFFLINE_FIRST.md](./docs/OFFLINE_FIRST.md) | Offline-first логика |
| [SYNC_ENGINE.md](./docs/SYNC_ENGINE.md) | Движок синхронизации |
| [PWA.md](./docs/PWA.md) | PWA конфигурация |
| [NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) | Уведомления |
| [PRODUCTION.md](./docs/PRODUCTION.md) | Production качество |

---

## Quick Start

```bash
# Clone
git clone <repo>
cd smart-reminder-pwa

# Backend
cd app/server
cp .env.example .env
npm install
npm run dev

# Frontend
cd app/client
cp .env.example .env
npm install
npm run dev
```

---

## Features

- ✅ Offline-first: работает без интернета
- ✅ Автоматическая синхронизация при восстановлении сети
- ✅ Conflict resolution (last-write-wins + versioning)
- ✅ JWT аутентификация
- ✅ Push-уведомления (Web Push API)
- ✅ PWA: installable, кешируется, работает как нативное приложение
- ✅ Bulk sync: пакетная отправка накопленных изменений
- ✅ Retry механизм с exponential backoff
- ✅ Полная типизация TypeScript
- ✅ Production logging (Winston)

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│           React PWA (Client)            │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │  Zustand │  │   API Layer (Axios)   │ │
│  │  Store   │  │   + Interceptors      │ │
│  └──────────┘  └──────────────────────┘ │
│  ┌──────────────────────────────────────┐│
│  │         Sync Engine                  ││
│  │  IndexedDB ←→ Queue ←→ Server API    ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │      Service Worker (Workbox)        ││
│  │   Cache Strategy + Push Handler      ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
                    │
                    │ HTTPS / REST API
                    ▼
┌─────────────────────────────────────────┐
│         Node.js + Express (Server)      │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │Reminders │  │  Sync  │ │
│  │ Controller│  │Controller│  │  Route │ │
│  └──────────┘  └──────────┘  └────────┘ │
│  ┌──────────────────────────────────────┐│
│  │         MongoDB (Mongoose)           ││
│  │   Users / Reminders / Subscriptions  ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
# Web-storis
