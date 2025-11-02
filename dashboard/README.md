# Analytics Dashboard for Goodreads Library Data

**Version**: 1.0 (Docker Deployment)
**Last Updated**: 2025-11-02

A full-stack web application that visualizes Goodreads library data with interactive charts and statistics.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (served by Nginx)
- **Backend**: Node.js 20 + NestJS + TypeORM
- **Database**: PostgreSQL 15+
- **Deployment**: Docker Compose

## Quick Start (5 Minutes)

### Prerequisites

- Docker Desktop (includes Docker Compose)
  - macOS: `brew install --cask docker`
  - Linux: https://docs.docker.com/engine/install/
  - Windows: https://www.docker.com/products/docker-desktop

- Goodreads library data (JSON files from scraper feature 001)

### Step 1: Configuration

```bash
cd dashboard

# Copy environment template
cp .env.example .env

# Edit configuration (REQUIRED: Change POSTGRES_PASSWORD)
nano .env
```

### Step 2: Start Application

```bash
# Build and start all containers
docker-compose up -d

# Wait for startup (~30 seconds)
docker-compose ps
```

**Expected output**:
```
NAME                  STATUS    PORTS
analytics_db          Up        5432/tcp
analytics_backend     Up        0.0.0.0:3001->3001/tcp
analytics_frontend    Up        0.0.0.0:3000->80/tcp
```

### Step 3: Access Dashboard

Open browser: http://localhost:3000

### Step 4: Upload Library Data

1. Click **"Upload Library"** button
2. Select all JSON files from your library export folder
3. Wait for upload to complete
4. Dashboard displays statistics automatically

## Features

### Summary Statistics
- Total books (by status: read, currently reading, to-read)
- Average rating & rating distribution
- Reading pace (books per month, reading streak)
- Year-over-year comparison

### Reading Trends Over Time
- Reading volume by month/quarter/year (line chart)
- Rating trends over time (line chart)

### Category Breakdowns
- Top genres with pie/bar charts
- Most-read authors
- Distribution by publication decade
- Page count ranges (short/medium/long)

### Filtering & Drill Down
- Date range filters (custom dates, presets)
- Rating range filters (min/max)
- Reading status filters
- Genre/shelf multi-select filters

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
2. In dashboard, click "Upload Library"
3. Select updated export folder
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

## API Access (Advanced)

### Swagger UI

Interactive API documentation:

```
http://localhost:3001/api/docs
```

### Example API Calls

```bash
# Health check
curl http://localhost:3001/api/health

# Get summary stats (no filters)
curl http://localhost:3001/api/analytics/summary

# Get filtered stats (books from 2024)
curl "http://localhost:3001/api/analytics/summary?dateStart=2024-01-01&dateEnd=2024-12-31"

# Get trends
curl http://localhost:3001/api/analytics/trends

# Get categories
curl http://localhost:3001/api/analytics/categories
```

## Development

### Local Development (Without Docker)

**Backend**:
```bash
cd backend
npm install
npm run start:dev
# API at http://localhost:3001
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173
```

**Database** (requires PostgreSQL 15+ installed):
```bash
# Create database
createdb analytics

# Run migrations
cd backend
npm run migration:run
```

### Running Tests

**Backend**:
```bash
cd backend
npm test
npm run test:e2e
```

**Frontend**:
```bash
cd frontend
npm test
```

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 86+     | ✅ Full support |
| Edge    | 86+     | ✅ Full support |
| Firefox | 50+     | ✅ Full support |
| Safari  | 11.1+   | ✅ Full support |

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | analytics | Database name |
| `POSTGRES_USER` | analytics_user | Database username |
| `POSTGRES_PASSWORD` | (required) | Database password |
| `BACKEND_PORT` | 3001 | Backend API port |
| `FRONTEND_PORT` | 3000 | Frontend web port |
| `NODE_ENV` | development | Environment (development/production) |

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | nginx:alpine | 3000:80 | React SPA served by Nginx |
| `backend` | node:20-alpine | 3001:3001 | NestJS API server |
| `db` | postgres:15-alpine | 5432 (internal) | PostgreSQL database |

## Getting Help

**Documentation**:
- Full quickstart guide: `/specs/002-analytics-dashboard/quickstart.md`
- Feature specification: `/specs/002-analytics-dashboard/spec.md`
- Data model: `/specs/002-analytics-dashboard/data-model.md`
- API contracts: `/specs/002-analytics-dashboard/contracts/`

**Issues**:
- Check `docker-compose logs` for error details
- Verify prerequisites (Docker, data format)

Happy reading! 📚
