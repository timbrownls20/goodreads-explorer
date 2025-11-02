# goodreads-explorer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-28

## Active Technologies
- **Frontend**: React 18 + TypeScript 5.x + Vite 5.x + react-chartjs-2 (Chart.js wrapper) (002-analytics-dashboard)
- **Backend**: Node.js 20+ LTS + NestJS 10+ + TypeORM 0.3+ + class-validator + Multer (002-analytics-dashboard)
- **Database**: PostgreSQL 15+ (002-analytics-dashboard)
- **Deployment**: Docker + Docker Compose (002-analytics-dashboard)
- **Python Scraper**: Python 3.10+ (Python 3.12 recommended) + BeautifulSoup4 + lxml (HTML parsing), httpx (HTTP client), pydantic v2 (data validation), aiometer (future async rate limiting) (001-scrape-goodreads-library)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.10+ (Python 3.12 recommended for development): Follow standard conventions

## Recent Changes
- 002-analytics-dashboard: Added React 18 + TypeScript + Vite (frontend), Node.js 20+ + NestJS + TypeORM (backend), PostgreSQL 15+, Docker Compose deployment
- 001-scrape-goodreads-library: Added Python 3.10+ (Python 3.12 recommended for development) + BeautifulSoup4 + lxml (HTML parsing), httpx (HTTP client), pydantic v2 (data validation), aiometer (future async rate limiting)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
