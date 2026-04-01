# Project Team and Responsibility Matrix

This document outlines the division of documentation and project ownership between technical team members.

## 👥 Team Members

- **Otabek** - Team Lead (Architecture & Management)
- **Sobirjon** - Senior Backend Engineer (Data & API)
- **Doni** - Senior Frontend Engineer (UI & UX)

---

## 📋 Documentation Ownership (Root Documents)

| Document | Primary Owner | Description |
| :--- | :--- | :--- |
| `ARCHITECTURE.md` | **Otabek** | System design and technical strategy |
| `PROJECT_STRUCTURE.md` | **Otabek** | Repository layout and standards |
| `PRODUCTION.md` | **Otabek** | Deployment and environment management |
| `TZ.md` | **Otabek** | Project initialization and core specs |
| `API_DESIGN.md` | **Sobirjon** | Endpoint architecture and communication protocol |
| `DATA_MODELS.md` | **Sobirjon** | Database schema and object types |
| `SYNC_ENGINE.md` | **Sobirjon** | Synchronization logic and conflict resolution |
| `FRONTEND.md` | **Doni** | React components and state management |
| `PWA.md` | **Doni** | Progressive Web App configuration |
| `OFFLINE_FIRST.md` | **Doni** | Offline functionality and cache strategies |
| `NOTIFICATIONS.md` | **Doni** | Push notifications and user alerts |

---

## 🛠 `docs/tz/` Distribution (Technical Specifications)

| Section | Owner | Topic |
| :--- | :--- | :--- |
| `00_INDEX.md` | **Otabek** | Guide Index |
| `01_OVERVIEW.md` | **Otabek** | General project overview |
| `02_GOALS.md` | **Otabek** | Business and technical goals |
| `06_ARCHITECTURE.md` | **Otabek** | Deep-dive architectural specs |
| `14_SECURITY.md` | **Otabek** | Security protocols and auth |
| `15_STRUCTURE.md` | **Otabek** | Codebase and directory structure |
| `17_DOD.md` | **Otabek** | Definition of Done & Quality metrics |
| `07_DATA_MODELS.md` | **Sobirjon** | Backend Data models |
| `08_API.md` | **Sobirjon** | Detailed API spec |
| `10_BACKEND.md` | **Sobirjon** | Core backend logic |
| `11_OFFLINE_SYNC.md`| **Sobirjon** | Background sync mechanism |
| `16_ENV.md` | **Sobirjon** | Environment configuration |
| `03_FUNCTIONAL.md` | **Doni** | Functional requirements |
| `04_NONFUNCTIONAL.md` | **Doni** | UX/Performance requirements |
| `05_TECH_STACK.md` | **Doni** | Frontend stack & Styling |
| `09_FRONTEND.md` | **Doni** | Frontend implementation details |
| `12_PWA.md` | **Doni** | Service workers & Manifest |
| `13_PUSH.md` | **Doni** | Push notifications implementation |

---

## 🚀 Key Responsibilities

### **Otabek (Team Lead)**
- Code reviews and Merge Request approvals.
- High-level architectural decisions.
- Production environment stability.
- Ensuring the project follows the "Definition of Done".

### **Sobirjon (Backend)**
- Database schema design (MongoDB).
- REST API implementation & optimization.
- Secure data synchronization and offline engine.
- Managing server logs and environment variables.

### **Doni (Frontend)**
- UI/UX implementation and premium styling.
- PWA setup and Service Worker logic.
- Real-time client-side synchronization.
- Push notifications integration.
