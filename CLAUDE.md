# goodreads-explorer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-29

## Active Technologies
- **Frontend**: React 18 + TypeScript 5.x + Vite 5.x + react-chartjs-2 (Chart.js wrapper) (002-analytics-dashboard)
- **Backend**: Node.js 20+ LTS + NestJS 10+ + **Sequelize** + class-validator + Multer (002-analytics-dashboard)
- **Database**: PostgreSQL 15+ with normalized Genre/Shelf/LiteraryAward tables (002-analytics-dashboard)
- **Deployment**: Docker + Docker Compose (002-analytics-dashboard)
- **Scraper**: TypeScript 5.x + Node.js 18+ + Cheerio (HTML parsing), Axios (HTTP client), class-validator + class-transformer (data validation), winston (logging) (001-scrape-goodreads-library)

## Project Structure

```text
parser/src/         # TypeScript scraper
dashboard-backend/  # NestJS API
dashboard-ui/       # React frontend
```

## Commands

```bash
# Scraper (parser/)
cd parser
pnpm install
pnpm build
pnpm test
pnpm run scrape:dev

# Backend (dashboard-backend/)
cd dashboard-backend
pnpm install
pnpm run start:dev

# Frontend (dashboard-ui/)
cd dashboard-ui
pnpm install
pnpm run dev
```

## Code Style

TypeScript: Follow standard conventions with strict mode enabled
Node.js: Use ESLint + Prettier for code formatting

## Recent Changes
- **2025-11-29**: 001-scrape-goodreads-library: Updated to TypeScript 5.x + Node.js 18+ implementation with Cheerio, Axios, class-validator (replaced Python implementation)
- **2025-11-10**: Updated data-model.md and tasks.md to reflect actual implementation: Sequelize (not TypeORM), normalized DB structure (not JSONB), library-import service with deduplication
- **2025-11-02**: 002-analytics-dashboard: Added React 18 + TypeScript + Vite (frontend), Node.js 20+ + NestJS + Sequelize (backend), PostgreSQL 15+ with normalized tables, Docker Compose deployment

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
- use pnpm for package manager unless instructed otherwise