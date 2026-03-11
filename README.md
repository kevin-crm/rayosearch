# RayoSearch

RayoSearch is an open-source platform that helps developers and merchants deploy powerful search powered by Azure AI Search in minutes instead of weeks.

Instead of manually configuring indexes, APIs, and UI components, RayoSearch provides a dashboard to:

- Connect an Azure AI Search instance
- Generate search indexes
- Upload searchable documents
- Build an embeddable search widget
- Deploy search instantly with a lightweight JavaScript snippet

The goal is simple: turn Azure AI Search into a plug-and-play search service for any website.

> **Status:** Early development (pre-v1). Core functionality is working but features are still evolving.

---

## Core Features

### Azure AI Search Integration

Connect your Azure AI Search service and manage indexes directly from the dashboard.

- Validate Azure AI Search connection
- Create and manage search indexes
- Configure index fields
- Define searchable and filterable fields

### Document Indexing

Upload structured JSON documents to populate your search index.

- Upload documents directly to Azure AI Search
- Support for structured product or content data
- Quickly populate indexes for testing or production

### Embeddable Search Widget

Generate a drop-in JavaScript search component for your site with instant search UI, customizable styling, and minimal footprint.

```html
<script src="https://your-domain/widget.js"></script>
```

Your site will have a fully functional search experience powered by Azure AI Search.

### Widget Builder

Customize your search UI without writing frontend code.

- Search bar styles
- Result layout templates
- Accent colors and theme support (light / dark)
- Placeholder text

### Site Management

Manage multiple websites and search integrations from one dashboard. Each site includes its own Azure AI Search connection, index configuration, widget configuration, and API keys.

---

## How It Works

RayoSearch acts as a control layer on top of Azure AI Search.

1. Create a site inside RayoSearch
2. Connect your Azure AI Search service
3. Generate a search index
4. Upload documents to the index
5. Configure your search widget
6. Embed the generated script on your website

Your site now has fully functional search powered by Azure AI Search.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | React 19 + TypeScript 5 |
| SSR Bridge | Inertia.js v2 |
| Styling | Tailwind CSS 4 |
| Build Tool | Vite 7 |
| Database | MySQL |
| Auth | Laravel session-based authentication |
| Search Engine | Azure AI Search |

---

## Getting Started

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+ and npm
- MySQL
- An [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search) service instance

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/RayoSearch.git
cd RayoSearch

# 2. Run the one-command setup
#    (installs deps, copies .env, generates app key, migrates DB, builds assets)
composer run setup
```

The setup script creates a `.env` file from `.env.example`. Configure your database credentials and Azure AI Search details before running:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rayosearch
DB_USERNAME=root
DB_PASSWORD=
```

### Development

```bash
# Start Laravel, queue worker, and Vite dev server concurrently
composer run dev
```

The app will be available at `http://localhost:8000`.

### Running Tests

```bash
composer run test
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `RayoSearch` | Application name |
| `APP_URL` | `http://localhost` | App URL |
| `DB_CONNECTION` | `mysql` | Database driver |
| `DB_DATABASE` | `rayosearch` | Database name |
| `SESSION_DRIVER` | `database` | Session storage |
| `QUEUE_CONNECTION` | `database` | Queue driver |
| `CACHE_STORE` | `database` | Cache driver |

See `.env.example` for the full list.

---

## Project Structure

```
RayoSearch/
├── app/
│   ├── Http/Controllers/     # Route handlers
│   ├── Models/               # Eloquent models
│   └── Services/             # Business logic (Azure AI Search)
├── database/migrations/      # Database schema
├── resources/js/
│   ├── Pages/                # Inertia page components
│   ├── Components/           # Reusable UI components
│   ├── Layouts/              # App shell layout
│   └── hooks/                # React hooks
├── routes/web.php            # All web routes
└── TECH_DOC.md               # Detailed architecture reference
```

For a full architecture breakdown, see [TECH_DOC.md](./TECH_DOC.md).

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

## Security

If you discover a security vulnerability, please follow the process in [SECURITY.md](./SECURITY.md). Do not open a public issue.

---

## Maintainer

Built and maintained by [Kevin](mailto:kevin@kevincrm.com). Questions, ideas, or feedback — feel free to reach out.

---

## License

MIT — see [LICENSE](./LICENSE).
