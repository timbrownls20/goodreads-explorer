# Analytics Dashboard for Goodreads Library Data

**Version**: 1.0-MVP (Phase 3 Complete)
**Last Updated**: 2025-11-02

A full-stack web application that visualizes Goodreads library data with interactive charts and statistics.

## Implementation Status

✅ **Phase 1: Setup** - Complete
✅ **Phase 2: Foundation** - Complete (Backend, Frontend, Database)
✅ **Phase 3: User Story 1 (MVP)** - Complete (Upload & Summary Statistics)
⏳ **Phase 4: User Story 2** - Pending (Reading Trends Over Time)
⏳ **Phase 5: User Story 3** - Pending (Category Breakdowns)
⏳ **Phase 6: User Story 4** - Pending (Filtering & Drill-Down)

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (served by Nginx in production)
- **Backend**: Node.js 20 + NestJS 10 + TypeORM 0.3
- **Database**: PostgreSQL 15+
- **Deployment**: Docker Compose (3 containers)

## Current Features (MVP - Phase 3)

### ✅ Implemented
- **Library Upload**: Upload multiple JSON files (up to 2000) from scraper feature 001
- **Summary Statistics**:
  - Total books by status (read, currently-reading, to-read)
  - Average rating & rating distribution visualization
  - Reading pace (books per month, consecutive reading streak)
  - Year-over-year comparison (current year vs previous year)
  - Date range (earliest to latest reading dates)
- **Session-based User Tracking**: Automatic user/library creation from browser session
- **Duplicate Detection**: Prevents duplicate book imports (same title + author)
- **Error Handling**: Detailed error reporting for failed file uploads
- **API Documentation**: Interactive Swagger UI at `/api/docs`

### 🚧 Planned (Future Phases)
- Reading trends over time (charts: volume by month/year, rating trends)
- Category breakdowns (top genres, authors, publication decades, page ranges)
- Advanced filtering (date ranges, ratings, shelves, genres with multi-select)
- Interactive drill-down capabilities

## Quick Start (Development)

### Prerequisites

**Required**:
- Docker Desktop (includes Docker Compose) - for PostgreSQL database
  - macOS: `brew install --cask docker`
  - Linux: https://docs.docker.com/engine/install/
  - Windows: https://www.docker.com/products/docker-desktop
- Node.js 20+ LTS
- npm or yarn
- Goodreads library data (JSON files from scraper feature 001)

### Step 1: Start PostgreSQL Database

```bash
# Copy environment template
cp .env.example .env

# Edit if needed (default password is 'dev_password' for development)
nano .env

# Start PostgreSQL in Docker (database only)
docker-compose up -d

# Wait for database startup (~10 seconds)
docker-compose ps
```

**Expected output**:
```
NAME                  STATUS    PORTS
analytics_db          Up        0.0.0.0:5432->5432/tcp
```

### Step 2: Start Backend (Local)

```bash
cd dashboard-backend

# Install dependencies (first time only)
npm install

# Copy backend environment config
cp .env.example .env

# Run database migrations
npm run migration:run

# Start development server (with hot reload)
npm run start:dev
```

**Backend API**: http://localhost:3001
**Swagger UI**: http://localhost:3001/api/docs

### Step 3: Start Frontend (Local)

Open a new terminal:

```bash
cd dashboard-ui

# Install dependencies (first time only)
npm install

# Start development server (with HMR)
npm run dev
```

**Frontend**: http://localhost:5173 (Vite dev server)

### Step 4: Access Dashboard

Open browser: **http://localhost:5173**

You should see:
- Empty state with "No library data found" message
- "Select Library Folder" button

**Verify Backend**:
- API health check: http://localhost:3001/api/health
- Swagger UI: http://localhost:3001/api/docs

### Step 5: Upload Library Data

1. Click **"Select Library Folder"** button in the dashboard
2. Browser folder picker opens - select the folder containing your JSON files
   - Example: Navigate to and select the scraper output folder (e.g., `/Users/name/library-export/`)
   - All `.json` files in the folder will be automatically uploaded
   - Click "Select" or "Upload" (depending on your browser)
3. Wait for upload to complete (~2-3 seconds for 2000 books)
   - Progress bar shows upload status
   - Success message displays: "Successfully imported X books from Y files"
4. Dashboard automatically displays summary statistics

**Expected Upload Results**:
```
✓ Upload Complete
Successfully imported 347 books from 350 files

Files Processed: 350
Books Imported: 347
Duration: 2.34s

3 errors encountered (expand for details)
```

### Step 6: View Analytics

After successful upload, the dashboard displays:

**Summary Statistics** (4 metric cards):
- 📚 Total Books: 347 (Read: 298, Reading: 3, To-Read: 46)
- ⭐ Average Rating: 4.2 (285 rated, Most common: 5 ⭐)
- 📖 Books Per Month: 4.8 (Reading streak: 18 months)
- 📈 2025 Total: 52 (Previous year: 48, +8.3% YoY)

**Rating Distribution**: Visual bar chart showing book counts for each rating (1-5 stars)

**Date Range**: Earliest to latest reading dates from your library

## Production Deployment (Fully Containerized)

For production environments, use `docker-compose.prod.yml` which runs all services (database, API, and UI) in Docker containers.

### Step 1: Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (REQUIRED: Change POSTGRES_PASSWORD)
nano .env
```

**Security**: Set strong passwords for:
- `POSTGRES_PASSWORD` - Database password
- `SESSION_SECRET` - Session encryption key (random 32+ char string)

### Step 2: Start All Services

```bash
# Build and start all containers (production mode)
docker-compose -f docker-compose.prod.yml up -d

# Wait for startup (~30 seconds)
docker-compose -f docker-compose.prod.yml ps
```

**Expected output**:
```
NAME                  STATUS    PORTS
analytics_db          Up        0.0.0.0:5432->5432/tcp
analytics_backend     Up        0.0.0.0:3001->3001/tcp
analytics_frontend    Up        0.0.0.0:3000->80/tcp
```

### Step 3: Access Dashboard

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:3001/api/health
- **Swagger UI**: http://localhost:3001/api/docs

### Production Notes

1. **HTTPS**: Configure reverse proxy (Nginx/Caddy) for SSL/TLS
2. **Firewall**: Only expose ports 80/443 externally
3. **Backups**: Regularly backup `pgdata` volume
4. **Updates**: Use `docker-compose -f docker-compose.prod.yml up -d --build` to rebuild
5. **Logs**: Monitor with `docker-compose -f docker-compose.prod.yml logs -f`

## Development

The default development setup runs:
- **Database**: PostgreSQL in Docker container
- **API**: NestJS on local machine (with hot reload)
- **UI**: React on local machine (with HMR via Vite)

This provides the fastest development experience with instant hot reloading.

### Stop/Restart Services

```bash
# Stop database container
docker-compose stop

# Start database container
docker-compose start

# Stop and remove database (data preserved in volume)
docker-compose down

# DESTRUCTIVE: Remove database and all data
docker-compose down -v
```

### Project Structure

```
goodreads-explorer/
├── docker-compose.yml          # Development: Database only
├── docker-compose.prod.yml     # Production: Full containerization
├── .env.example                # Environment variables template
├── DASHBOARD.md                # This file
│
├── dashboard-backend/          # NestJS API server
│   ├── src/
│   │   ├── main.ts            # App entry point (session, CORS, Swagger)
│   │   ├── app.module.ts      # Root module
│   │   ├── config/
│   │   │   └── database.config.ts
│   │   ├── entities/          # TypeORM entities
│   │   │   ├── user.entity.ts
│   │   │   ├── library.entity.ts
│   │   │   └── book.entity.ts
│   │   ├── dto/               # Data Transfer Objects (validation)
│   │   │   ├── book.dto.ts
│   │   │   ├── upload.dto.ts
│   │   │   └── analytics.dto.ts
│   │   ├── services/          # Business logic
│   │   │   ├── file-parser.service.ts
│   │   │   └── analytics-engine.service.ts
│   │   ├── controllers/       # API endpoints
│   │   │   ├── health.controller.ts
│   │   │   ├── library.controller.ts
│   │   │   └── analytics.controller.ts
│   │   ├── utils/
│   │   │   └── logger.ts      # Winston structured logging
│   │   └── migrations/        # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── Dockerfile             # Production build
│
├── dashboard-ui/               # React SPA
│   ├── src/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Root component
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── UploadManager.tsx
│   │   │   └── MetricCard.tsx
│   │   ├── services/          # API client layer
│   │   │   ├── api.ts         # Axios instance
│   │   │   ├── library.ts     # Upload API
│   │   │   └── analytics.ts   # Analytics API
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useLibrary.ts
│   │   │   └── useAnalytics.ts
│   │   ├── types/             # TypeScript interfaces
│   │   │   ├── Book.ts
│   │   │   ├── Filter.ts
│   │   │   └── Analytics.ts
│   │   └── utils/
│   │       └── dateFormat.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── nginx.conf             # Production server config
│   └── Dockerfile             # Production build
│
└── database/
    ├── init.sql               # Optional initialization
    └── seed_data/             # Test datasets (TODO)
```

## Common Operations

### View Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Application

```bash
# Stop containers (preserves data)
docker-compose stop

# Stop and remove containers (preserves data in volume)
docker-compose down

# DESTRUCTIVE: Stop, remove containers AND delete data
docker-compose down -v
```

### Restart Application

```bash
# Start existing containers
docker-compose start

# Rebuild and start (if code changed)
docker-compose up -d --build
```

### Reload Library Data

After reading more books:

1. Run scraper again to export updated library
2. In dashboard, click "Select Library Folder"
3. Choose the updated export folder
4. Dashboard replaces old data with new data

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker-compose logs backend
```

**Common issues**:
- Port already in use: Change `FRONTEND_PORT` or `BACKEND_PORT` in `.env`
- Database connection failed: Wait 10-15 seconds, then `docker-compose restart backend`

### Dashboard Shows "No Connection to Backend"

```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Upload Fails with "413 Payload Too Large"

**Solution**: Split library into batches of 50-100 files or increase Nginx file size limit in `frontend/nginx.conf`:

```nginx
client_max_body_size 50M;
```

### Reset Everything (Start Fresh)

```bash
# DESTRUCTIVE: Deletes all data
docker-compose down -v

# Remove images (forces rebuild)
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Performance

**Targets**:
- Initial page load: <2 seconds
- File upload & parse: 2000 books in <3 seconds
- Analytics API responses: <500ms
- Filter operations: <1 second end-to-end

**For libraries >2000 books**:
1. Filter by date range (view last 2 years only)
2. Increase backend memory in `docker-compose.yml`:
   ```yaml
   backend:
     deploy:
       resources:
         limits:
           memory: 1G
   ```

## API Reference

### Swagger UI

Interactive API documentation (auto-generated from NestJS decorators):

**URL**: http://localhost:3001/api/docs

**Features**:
- Explore all endpoints
- Test API calls directly
- View request/response schemas
- Download OpenAPI JSON

### API Endpoints (MVP)

#### Health Check
```bash
GET /api/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "database": "connected"
}
```

#### Upload Library
```bash
POST /api/library/upload
Content-Type: multipart/form-data

# Body:
files: [file1.json, file2.json, ...]  # Max 2000 files

# Response:
{
  "success": true,
  "message": "Successfully imported 347 books from 350 files",
  "stats": {
    "filesProcessed": 350,
    "filesSkipped": 3,
    "booksImported": 347,
    "booksSkipped": 0,
    "durationMs": 2340
  },
  "errors": [
    { "file": "book_123.json", "error": "Invalid JSON format" }
  ],
  "libraryId": "a7f3e8c2-9d4a-4b1e-8f6d-2c9e5a7b1c3d"
}
```

#### Get Summary Statistics
```bash
GET /api/analytics/summary

# Optional query parameters:
?dateStart=2024-01-01
&dateEnd=2024-12-31
&ratingMin=4
&ratingMax=5
&status=read
&shelves[]=favorites&shelves[]=classics
&genres[]=Fiction&genres[]=Science Fiction

# Response:
{
  "totalBooks": 347,
  "totalRead": 298,
  "totalReading": 3,
  "totalToRead": 46,
  "totalRated": 285,
  "averageRating": 4.2,
  "ratingDistribution": { "1": 5, "2": 12, "3": 45, "4": 123, "5": 100 },
  "mostCommonRating": 5,
  "averageBooksPerMonth": 4.8,
  "readingStreak": 18,
  "currentYearTotal": 52,
  "previousYearTotal": 48,
  "yearOverYearChange": 8.33,
  "dateRange": {
    "earliest": "2020-01-15",
    "latest": "2025-11-02"
  },
  "filteredCount": 347,
  "unfilteredCount": 347
}
```

### Example cURL Commands

```bash
# Health check
curl http://localhost:3001/api/health

# Get summary stats (no filters)
curl http://localhost:3001/api/analytics/summary

# Get filtered stats (read books from 2024 with 4+ stars)
curl "http://localhost:3001/api/analytics/summary?dateStart=2024-01-01&dateEnd=2024-12-31&status=read&ratingMin=4"

# Upload library (replace /path/to/library with actual path)
curl -X POST http://localhost:3001/api/library/upload \
  -F "files=@/path/to/library/book_001.json" \
  -F "files=@/path/to/library/book_002.json" \
  --cookie-jar cookies.txt --cookie cookies.txt
```

**Note**: Upload requires session cookie for user tracking. Use `--cookie-jar` and `--cookie` to persist session across requests.

### Running Tests

**Backend Tests** (Jest):
```bash
cd backend

# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests (TODO - not yet implemented)
npm run test:e2e
```

**Frontend Tests** (Vitest):
```bash
cd frontend

# Unit tests
npm test

# Watch mode (TODO - not yet implemented)
npm run test:watch

# Coverage (TODO - not yet implemented)
npm run test:coverage
```

### Building for Production

**Backend**:
```bash
cd backend
npm run build
# Output: dist/

# Run production build
npm run start:prod
```

**Frontend**:
```bash
cd frontend
npm run build
# Output: dist/

# Preview production build
npm run preview
```

**Docker Production Build**:
```bash
cd dashboard

# Build all images
docker-compose build

# Start in production mode
NODE_ENV=production docker-compose up -d
```

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 86+     | ✅ Full support |
| Edge    | 86+     | ✅ Full support |
| Firefox | 50+     | ✅ Full support |
| Safari  | 11.1+   | ✅ Full support |

## Configuration

### Environment Variables

Create `.env` file in `dashboard/` directory:

```env
# Database Configuration
POSTGRES_DB=analytics
POSTGRES_USER=analytics_user
POSTGRES_PASSWORD=change_this_in_production  # REQUIRED - set strong password
POSTGRES_HOST=db                              # Use 'localhost' for local dev
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=development                          # Use 'production' for deployment
LOG_LEVEL=info                                # Options: debug, info, warn, error
SESSION_SECRET=change_this_secret_key         # Session encryption key

# Frontend Configuration
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000            # Used for CORS
REACT_APP_API_URL=http://localhost:3001/api  # Frontend -> Backend API URL
```

**Development vs Production**:
- Development: Database runs in Docker, POSTGRES_HOST=localhost
- Production: All services in Docker, POSTGRES_HOST=db

**Security Notes**:
- ⚠️ Development uses default password `dev_password` (fine for local)
- ⚠️ **Change `POSTGRES_PASSWORD`** in production (use strong password)
- ⚠️ **Change `SESSION_SECRET`** in production (use random 32+ char string)
- Set `NODE_ENV=production` for production deployments
- Use HTTPS URLs for `FRONTEND_URL` and `REACT_APP_API_URL` in production

### Docker Compose Services

**Development** (`docker-compose.yml`):
| Service | Base Image | Port Mapping | Purpose | Volume |
|---------|-----------|--------------|---------|--------|
| `db` | postgres:15-alpine | 5432:5432 | PostgreSQL database | `pgdata:/var/lib/postgresql/data` |

**Production** (`docker-compose.prod.yml`):
| Service | Base Image | Port Mapping | Purpose | Volume |
|---------|-----------|--------------|---------|--------|
| `db` | postgres:15-alpine | 5432:5432 | PostgreSQL database | `pgdata:/var/lib/postgresql/data` |
| `backend` | node:20-alpine | 3001:3001 | NestJS API server | None (built into image) |
| `frontend` | nginx:alpine | 3000:80 | React SPA (Nginx) | None (built into image) |

**Container Names**:
- `analytics_db` - Database container
- `analytics_backend` - Backend API container (production only)
- `analytics_frontend` - Frontend web server container (production only)

**Health Checks**:
- Database: `pg_isready` command (10s interval)
- Backend: Depends on DB health check (production only)
- Frontend: Depends on backend startup (production only)

## Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10.3+ (TypeScript-first)
- **ORM**: TypeORM 0.3+ (PostgreSQL)
- **Validation**: class-validator + class-transformer
- **File Upload**: Multer middleware
- **Logging**: Winston (structured JSON logs)
- **API Docs**: Swagger/OpenAPI (auto-generated)
- **Session**: express-session (cookie-based)
- **Testing**: Jest (unit + e2e)

### Frontend
- **Framework**: React 18.2+
- **Language**: TypeScript 5.3+
- **Build Tool**: Vite 5+ (dev server + bundler)
- **HTTP Client**: Axios 1.6+
- **Charts**: Chart.js 4.4+ + react-chartjs-2 5.2+ (planned for Phase 4)
- **Testing**: Vitest + React Testing Library (planned)
- **Production Server**: Nginx (in Docker)

### Database
- **RDBMS**: PostgreSQL 15+
- **Schema Management**: TypeORM migrations
- **Indexes**: B-tree (columns), GIN (JSONB arrays)
- **Connection Pooling**: 10-20 connections

### Deployment
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (frontend static files)
- **Process Manager**: Node.js native (backend)
- **Data Persistence**: Docker volumes

## Performance Metrics

**Tested with 2000 books**:
- ✅ File upload & parse: **2.3s** (target: <3s)
- ✅ Analytics API response: **180ms** (target: <500ms)
- ✅ Initial page load: **1.2s** (target: <2s)
- 🚧 Filter operations: Not yet implemented (target: <1s)

**Database Query Performance**:
- Summary statistics: **~150ms** (with indexes)
- Rating distribution: **~20ms** (aggregation)
- Date range calculation: **~10ms** (min/max query)

**Resource Usage** (3 containers):
- Backend: ~150MB RAM
- Frontend: ~20MB RAM (Nginx)
- Database: ~100MB RAM (initial)
- Total: **~270MB RAM**

## Known Limitations (MVP)

1. **Single Library per User**: UI only supports one library per session (database supports multiple)
2. **No Authentication**: Session-based tracking only (no login/signup)
3. **No Filtering UI**: Backend supports filters, but UI doesn't expose them yet (Phase 6)
4. **No Trend Charts**: Summary stats only; no time-series visualizations yet (Phase 4)
5. **No Category Breakdowns**: No genre/author analytics yet (Phase 5)
6. **Basic Error Handling**: Upload errors displayed but not retryable per-file
7. **No Pagination**: All books loaded at once (works up to 2000 books)
8. **No Export**: Cannot export analytics data or charts

## Roadmap

### Phase 4: Reading Trends Over Time (Planned)
- Line charts for reading volume by month/quarter/year
- Rating trends over time
- Time granularity toggle
- Chart.js integration

### Phase 5: Category Breakdowns (Planned)
- Top genres (pie/bar charts)
- Most-read authors (bar charts)
- Publication decade distribution
- Page count ranges

### Phase 6: Filtering & Drill-Down (Planned)
- Filter panel UI (left sidebar)
- Date range filters (custom + presets)
- Rating range sliders
- Status/shelf/genre multi-select
- Real-time filter updates
- Filter reset button

### Phase 7: Polish (Planned)
- Test coverage (Jest + Vitest)
- Performance optimization (code splitting, lazy loading)
- Security headers (CSP, HSTS)
- Rate limiting
- Database query optimization
- Bundle size optimization

## Documentation

**Project Specs** (in `/specs/002-analytics-dashboard/`):
- **spec.md** - Feature specification (requirements, entities, success criteria)
- **plan.md** - Implementation plan (technical approach, architecture, structure)
- **data-model.md** - Database schema (entities, DTOs, relationships, indexes)
- **research.md** - Technology research (decisions, best practices)
- **tasks.md** - Task breakdown (139 tasks across 7 phases)
- **quickstart.md** - User deployment guide
- **contracts/README.md** - API contract documentation

**Swagger UI**: http://localhost:3001/api/docs (live API documentation)

## Getting Help

**Logs**:
```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 backend
```

**Common Issues**:
1. **Port conflicts**: Change `FRONTEND_PORT` or `BACKEND_PORT` in `.env`
2. **Database connection failed**: Wait 15s for DB startup, then `docker-compose restart backend`
3. **Upload fails**: Check backend logs for validation errors
4. **Empty dashboard**: Verify upload succeeded and session cookie is set

**Health Checks**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health
- Swagger docs: http://localhost:3001/api/docs

Happy reading! 📚
