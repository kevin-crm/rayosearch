# AISearchGen — Technical Document
**Phase**: Early Development (Pre-V1)
**Last Updated**: March 2026

---

## Overview

AISearchGen is a SaaS platform for embedding AI-powered product search into e-commerce sites. Merchants register their sites, generate API keys, embed a JavaScript widget, and sync their product catalog for indexing. The application provides a dashboard for managing sites, API keys, indexing configuration, and analytics.

---

## Architecture

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | React 19 + TypeScript |
| Routing / SSR bridge | Inertia.js v2 |
| Styling | Tailwind CSS 4.2 + CSS custom properties |
| Build tool | Vite 7 |
| Database | MySQL (local: `aisearchgen`) |
| Authentication | Laravel session-based auth (database driver) |
| Job/Queue | Laravel database queue |
| Cache | Laravel database cache |

The app is a monorepo — Laravel serves as both API and asset host. Inertia.js eliminates the need for a separate REST API for page data; React pages receive props directly from Laravel controllers.

---

## Directory Structure

```
AISearchGen/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php            # Base (empty abstract)
│   │   │   ├── SiteController.php
│   │   │   ├── ApiKeyController.php
│   │   │   └── IndexingController.php
│   │   └── Middleware/
│   │       └── HandleInertiaRequests.php # Shares auth.user to all pages
│   ├── Models/
│   │   ├── User.php
│   │   ├── Site.php
│   │   └── ApiKey.php
│   └── Providers/
│       └── AppServiceProvider.php
├── database/migrations/
├── resources/
│   ├── css/app.css                       # Tailwind + theme variables
│   ├── views/app.blade.php               # Single Inertia root view
│   └── js/
│       ├── app.tsx                       # Inertia + React entrypoint
│       ├── Layouts/AppLayout.tsx
│       ├── Pages/
│       ├── Components/
│       ├── hooks/
│       └── types/
├── routes/
│   ├── web.php
│   └── console.php
├── vite.config.ts
├── tsconfig.json
└── .env
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| email_verified_at | timestamp | nullable |
| password | string | bcrypt hashed |
| remember_token | string | |
| created_at / updated_at | timestamps | |

### `sites`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | |
| url | string | |
| site_id | string unique | Format: `site_<16-char-random>` |
| created_at / updated_at | timestamps | |

### `api_keys`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | Human-readable label |
| key | string unique (max 64) | Format: `asg_<40-char-random>` |
| last_used_at | timestamp | nullable |
| created_at / updated_at | timestamps | |

### Supporting tables
- `sessions` — database session storage
- `cache` — database cache store
- `jobs` — database queue jobs
- `password_reset_tokens`

---

## Routes

All routes are in `routes/web.php`. No API routes are defined yet.

```
GET    /                    → redirect /dashboard
GET    /dashboard           → Inertia: Dashboard
GET    /sites               → SiteController@index
POST   /sites               → SiteController@store
GET    /indexing            → Inertia: Indexing
POST   /indexing/sync       → IndexingController@sync
GET    /api-keys            → ApiKeyController@index
POST   /api-keys            → ApiKeyController@store
DELETE /api-keys/{apiKey}   → ApiKeyController@destroy
GET    /analytics           → Inertia: Analytics
GET    /settings            → Inertia: Settings
```

---

## Controllers

### `SiteController`
- `index()` — Returns all sites ordered by latest, rendered to `Sites/Index`
- `store(Request)` — Validates `name` + `url`, generates a unique `site_id`, creates record

### `ApiKeyController`
- `index()` — Returns all API keys ordered by latest, rendered to `ApiKeys`
- `store(Request)` — Validates `name`, generates `asg_<40-char>` key, creates record
- `destroy(ApiKey)` — Deletes API key by model binding

### `IndexingController`
- `sync(Request)` — **Placeholder.** Returns a success message; no actual job dispatched yet.

### `HandleInertiaRequests` (Middleware)
- Shares `auth.user` (id, name, email) as Inertia shared data on every request.

---

## Models

| Model | Fillable | Notable Casts |
|-------|----------|---------------|
| `User` | name, email, password | password → hashed, email_verified_at → datetime |
| `Site` | name, url, site_id | — |
| `ApiKey` | name, key, last_used_at | last_used_at → datetime |

---

## Frontend

### Pages

| Route | Component | Status |
|-------|-----------|--------|
| `/dashboard` | `Pages/Dashboard.tsx` | UI complete, data is placeholder (all zeros) |
| `/sites` | `Pages/Sites/Index.tsx` | Functional — create + list sites, copy embed snippet |
| `/api-keys` | `Pages/ApiKeys.tsx` | Functional — create, list, copy, revoke (revoke UI exists, no handler) |
| `/indexing` | `Pages/Indexing.tsx` | UI complete, sync is simulated client-side only |
| `/analytics` | `Pages/Analytics.tsx` | Stub — "Coming in V1" placeholder |
| `/settings` | `Pages/Settings.tsx` | UI complete, no save handlers wired |

### Layout

`Layouts/AppLayout.tsx` — Persistent shell with:
- Left sidebar: logo, nav links (Dashboard, Sites, Indexing, Analytics, Settings), user avatar
- Top bar: page title, dark/light theme toggle
- Main content area with scroll

### Reusable Components

| Component | Props | Notes |
|-----------|-------|-------|
| `Panel` | `title?`, `description?`, `className?` | Card container with optional header |
| `Button` | `variant` (primary/secondary/danger/ghost), `size` (sm/md) | Polymorphic |
| `Badge` | `variant` (success/warning/error/neutral) | Status pill |

### Hooks

**`useTheme()`** — Returns `{ theme: 'dark' | 'light', toggle }`. Persists to `localStorage`, detects system preference on first load.

### Types (`types/index.ts`)

```ts
User    { id, name, email }
Site    { id, name, url, site_id, created_at, updated_at }
ApiKey  { id, name, key, last_used_at, created_at }
PageProps { auth: { user: User } }
```

---

## Theming

Dark/light mode is toggled via a `.dark` class on `<html>`. All color usage flows through CSS custom properties:

| Variable | Light | Dark |
|----------|-------|------|
| `--bg` | `#f7f7f8` | `#000000` |
| `--panel` | `#ffffff` | `#141414` |
| `--border` | `#e5e5e7` | `#222222` |
| `--fg` | `#111113` | `#ffffff` |
| `--fg-muted` | `#6b7280` | `#888888` |
| Accent | `#5aa9ff` | `#5aa9ff` |

---

## Key Dependencies

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `laravel/framework` | ^12.0 | Core framework |
| `inertiajs/inertia-laravel` | ^2.0 | Server-side Inertia adapter |
| `laravel/tinker` | ^2.10 | REPL |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2 | UI framework |
| `@inertiajs/react` | ^2.3 | Client-side Inertia adapter |
| `typescript` | ^5.9 | Type safety |
| `tailwindcss` | ^4.2 | Utility CSS |
| `vite` | ^7.0 | Dev server + bundler |
| `axios` | ^1.11 | HTTP client |

---

## Environment Variables

```env
APP_NAME=AISearchGen
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aisearchgen

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

BCRYPT_ROUNDS=12
VITE_APP_NAME=AISearchGen
```

---

## Dev Setup

```bash
# Full setup (install deps, generate key, migrate, build)
composer run setup

# Start all services concurrently (Laravel + queue + logs + Vite)
composer run dev

# Run tests
composer test
```

---

## What's Not Yet Implemented

| Feature | Status |
|---------|--------|
| User login / registration flow | No auth pages or AuthController |
| API key validation on requests | Keys are generated but not enforced |
| Actual product indexing / sync | `IndexingController@sync` is a stub |
| Analytics data | Entire page is a placeholder |
| Settings save handlers | Inputs render but POST nothing |
| API key revoke handler | Button exists, no controller action |
| Multi-tenancy / user scoping | Sites and API keys are not scoped to a user |
| External API integration | CDN/search API URLs are hardcoded placeholders |

---

## Planned External Integrations

| Service | Purpose |
|---------|---------|
| `https://api.aisearchgen.com/v1/search` | Search query endpoint (external) |
| `https://cdn.aisearchgen.com/widget.js` | Embeddable search widget (CDN) |

---

## Notes

- **No auth guard** is currently applied to any route — all pages are publicly accessible.
- Sites and API Keys are **not scoped to a user**; adding `user_id` foreign keys will be required before multi-user support.
- The `Analytics` page and the `Settings` save actions are the most incomplete areas.
- The queue and cache are both on the database driver — fine for development, should be switched to Redis in production.
