# Goodreads Explorer

Multi-component application for scraping, exploring, and analyzing Goodreads library data.

**Features**:
- 📥 Scrape Goodreads library data from profile URLs
- 📊 Visualize reading statistics with interactive dashboard
- 📈 Analyze reading trends, ratings, and patterns
- 🔍 Explore book metadata (genres, authors, publication dates)

## Project Structure

This is a multi-component monorepo with separate codebases for different concerns:

```
goodreads-explorer/
├── parser/             # Python scraping & parsing (Feature 001)
│   ├── src/           # Python source (models, parsers, scrapers, exporters, CLI)
│   ├── tests/         # Python test suite
│   └── pyproject.toml
├── dashboard-ui/       # React + TypeScript + Vite SPA (Feature 002)
├── dashboard-backend/  # NestJS + TypeORM API server (Feature 002)
├── database/          # PostgreSQL setup & migrations (Feature 002)
├── docker-compose.yml # Docker Compose for dashboard deployment
└── specs/             # Feature specifications & implementation plans
```

### Components

#### 1. Scraper (Feature 001) - Python
- Scrapes Goodreads library data from profile URLs
- Parses HTML with BeautifulSoup4
- Exports to JSON (individual files per book) or CSV
- Provides CLI: `goodreads-explorer scrape --user-id USER_ID`
- **Status**: ✅ Complete (MVP)

**Documentation**: [Parse Component README](./parser/README.md) | [Quickstart Guide](./specs/001-scrape-goodreads-library/quickstart.md)

#### 2. Analytics Dashboard (Feature 002) - Full Stack
- Full-stack web application for visualizing library data
- Upload JSON files from scraper → View analytics
- Summary statistics (totals, ratings, reading pace, year-over-year)
- Rating distribution visualization
- Session-based user tracking
- **Status**: ✅ Phase 3 Complete (MVP: Upload & Summary Statistics)
- **Planned**: Phase 4-6 (Trends, Categories, Filtering)

**Documentation**: [Dashboard README](./DASHBOARD.md) | [Full Spec](./specs/002-analytics-dashboard/spec.md)

**Quick Start**:
```bash
cp .env.example .env
docker-compose up -d
# Open http://localhost:3000
```

## Technology Stack

### Scraper (Python)
- **Runtime**: Python 3.10+ (3.12 recommended)
- **Libraries**: BeautifulSoup4, httpx, Pydantic v2
- **Testing**: pytest

### Dashboard (Full Stack)
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js 20 + NestJS 10 + TypeORM
- **Database**: PostgreSQL 15+
- **Deployment**: Docker Compose (3 containers)

## Getting Started

### Option 1: Scrape Your Goodreads Library

```bash
# Install scraper
cd parser
python3 -m pip install -e .

# Scrape library data
goodreads-explorer scrape --user-id YOUR_GOODREADS_USER_ID

# Output: JSON files in timestamped directory
```

**Documentation**: [Scraper Quickstart](./specs/001-scrape-goodreads-library/quickstart.md)

### Option 2: Run Analytics Dashboard

```bash
# Start dashboard (requires Docker)
cp .env.example .env
docker-compose up -d

# Open dashboard
open http://localhost:3000

# Upload JSON files from scraper
# View analytics automatically
```

**Documentation**: [Dashboard README](./DASHBOARD.md) | [Dashboard Quickstart](./specs/002-analytics-dashboard/quickstart.md)

### Full Workflow

1. **Scrape**: `goodreads-explorer scrape --user-id USER_ID` → Exports JSON files
2. **Upload**: Open http://localhost:3000 → Click "Upload Library" → Select JSON files
3. **Analyze**: View summary statistics, ratings, reading pace automatically

## Requirements

### For Scraper
- **Python 3.10 or higher** (Python 3.12+ recommended)
- Use `python3` command (not `python`)
- Install with: `python3 -m pip install -e parser/`

### For Dashboard
- **Docker Desktop** (includes Docker Compose)
  - macOS: `brew install --cask docker`
  - Linux: https://docs.docker.com/engine/install/
  - Windows: https://www.docker.com/products/docker-desktop
- **OR** for local development: Node.js 20+, PostgreSQL 15+

## Component Documentation

| Component | Status | README | Quickstart | Full Spec |
|-----------|--------|--------|------------|-----------|
| **Scraper** | ✅ Complete (MVP) | [README](./parser/README.md) | [Quickstart](./specs/001-scrape-goodreads-library/quickstart.md) | [Spec](./specs/001-scrape-goodreads-library/spec.md) |
| **Dashboard** | ✅ Phase 3 Complete | [README](./DASHBOARD.md) | [Quickstart](./specs/002-analytics-dashboard/quickstart.md) | [Spec](./specs/002-analytics-dashboard/spec.md) |

## Features

### ✅ Implemented

**Feature 001: Scrape Goodreads Library**
- Command-line scraper for Goodreads profile data
- Exports individual JSON files (one per book)
- CSV export support
- Handles pagination (up to 2000 books tested)
- Rate limiting and error handling

**Feature 002: Analytics Dashboard (MVP)**
- Web-based dashboard (React + NestJS + PostgreSQL)
- File upload (multiple JSON files from scraper)
- Summary statistics:
  - Total books by status (read, currently-reading, to-read)
  - Average rating & distribution visualization
  - Reading pace (books/month, streak)
  - Year-over-year comparison
- Session-based user tracking
- Duplicate detection
- Interactive Swagger UI at `/api/docs`

### 🚧 Planned (Dashboard Phases 4-6)

- **Phase 4**: Reading trends over time (line charts)
- **Phase 5**: Category breakdowns (genres, authors, decades)
- **Phase 6**: Advanced filtering & drill-down

## Development Workflow

This project uses the [SpecKit](https://github.com/anthropics/claude-code) workflow for structured feature development.

**Workflow**:
1. `/speckit.specify` - Create feature specification
2. `/speckit.plan` - Generate implementation plan
3. `/speckit.tasks` - Break down into tasks
4. `/speckit.implement` - Execute implementation

Feature specifications and implementation plans are in the `specs/` directory.

## Performance

**Scraper**:
- ~5 books/second with rate limiting
- Handles libraries up to 2000 books
- Exports ~350 books in ~70 seconds

**Dashboard**:
- Upload & parse 2000 books: **2.3s**
- Analytics API response: **180ms**
- Initial page load: **1.2s**
- Resource usage: **~270MB RAM** (3 Docker containers)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   User                          │
└───────────┬─────────────────────┬───────────────┘
            │                     │
            │ 1. Scrape           │ 2. Upload & View
            ▼                     ▼
┌─────────────────────┐  ┌────────────────────────┐
│  Scraper (Python)   │  │  Dashboard (Web App)   │
│                     │  │                        │
│  - CLI Interface    │  │  Frontend (React)      │
│  - BeautifulSoup    │  │  Backend (NestJS)      │
│  - JSON/CSV Export  │  │  Database (PostgreSQL) │
└──────────┬──────────┘  └───────────┬────────────┘
           │                         │
           │ JSON Files              │ Analytics
           ▼                         ▼
      Export Folder ────────────> Upload & Visualize
```
