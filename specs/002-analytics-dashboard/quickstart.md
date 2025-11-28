# Quickstart Guide: Analytics Dashboard

**Feature**: Analytics Dashboard for Goodreads Library Data
**Version**: 1.0 (Docker Deployment)
**Last Updated**: 2025-11-02

## Overview

The Analytics Dashboard is a full-stack web application that visualizes your Goodreads library data with interactive charts and statistics. The application runs in Docker containers for consistent deployment and easy setup.

**Architecture**:
- 🎨 **Frontend**: React SPA (served by Nginx)
- ⚙️ **Backend**: Node.js/NestJS API server
- 💾 **Database**: PostgreSQL

**Key Features**:
- 📊 Summary statistics (total books, average rating, reading pace)
- 📈 Temporal trends (reading volume by month/year, rating trends)
- 🏷️ Category breakdowns (top genres, authors, publication decades)
- 🔍 Interactive filtering (date ranges, ratings, shelves, status)

---

## Prerequisites

Before starting, ensure you have:

### 1. **Docker & Docker Compose**

**macOS**:
```bash
# Install Docker Desktop (includes Docker Compose)
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop
```

**Linux**:
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Windows**:
- Download Docker Desktop: https://www.docker.com/products/docker-desktop

**Verify Installation**:
```bash
docker --version
# Expected: Docker version 20.10+

docker-compose --version
# Expected: Docker Compose version 1.29+ or 2.0+
```

---

### 2. **Goodreads Library Data**

You need library data exported by the scraper feature (001-scrape-goodreads-library):

**Format**: Folder containing multiple JSON files (one per book)

**Example**:
```
/Users/yourname/library-export/
├── book_001.json
├── book_002.json
├── book_003.json
...
```

**If you don't have data yet**:
1. Run the scraper: `cd src && python -m goodreads_explorer.cli scrape --user-id YOUR_ID`
2. Note the output folder path

---

## Quick Start (5 Minutes)

### Step 1: Navigate to Dashboard Directory

```bash
cd /path/to/goodreads-explorer/dashboard
```

**Expected Structure**:
```
dashboard/
├── docker-compose.yml
├── .env.example
├── frontend/
├── backend/
└── database/
```

---

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (optional - defaults work for local development)
nano .env
```

**Default `.env` Contents**:
```env
# Database Configuration
POSTGRES_DB=analytics
POSTGRES_USER=analytics_user
POSTGRES_PASSWORD=change_this_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=development

# Frontend Configuration
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:3001/api
```

**For Production**: Change `POSTGRES_PASSWORD` to a strong password.

---

### Step 3: Start the Application

```bash
# Build and start all containers
docker-compose up -d

# Expected output:
# Creating network "dashboard_default" with the default driver
# Creating volume "dashboard_pgdata" with default driver
# Creating dashboard_db_1 ... done
# Creating dashboard_backend_1 ... done
# Creating dashboard_frontend_1 ... done
```

**Wait for startup** (~30 seconds):
```bash
# Check container status
docker-compose ps

# Expected:
# Name                 State          Ports
# --------------------------------------------------------
# dashboard_db_1       Up             5432/tcp
# dashboard_backend_1  Up             0.0.0.0:3001->3001/tcp
# dashboard_frontend_1 Up             0.0.0.0:3000->80/tcp
```

---

### Step 4: Access the Dashboard

**Open in Browser**:
```
http://localhost:3000
```

You should see:
- Dashboard header with "Analytics Dashboard" title
- "Upload Library" button (since no data loaded yet)
- Empty state message: "No library data found. Please upload your library to get started."

**API Health Check** (optional):
```bash
curl http://localhost:3001/api/health

# Expected: {"status":"ok","database":"connected"}
```

---

### Step 5: Upload Your Library Data

1. **Click "Upload Library" button**
   - Browser file picker opens

2. **Select Your Library Folder**
   - Navigate to your scraper output folder (e.g., `/Users/name/library-export/`)
   - Select all JSON files (Cmd/Ctrl+A) or the folder (depending on browser)
   - Click "Open"

3. **Upload Progress**
   - Progress bar shows: "Uploading 347 files..."
   - Backend processes files: "Parsing books... 150/347"
   - Completion message: "Successfully imported 347 books!"

4. **View Dashboard**
   - Dashboard refreshes automatically
   - Summary statistics appear
   - Charts begin rendering

**Troubleshooting Upload**:
- **"Upload failed" error**: Check backend logs (`docker-compose logs backend`)
- **"Invalid JSON" warnings**: Some files may be corrupted; check logs for details
- **Slow upload**: 2000 books take ~2-3 seconds; wait for completion

---

### Step 6: Explore Your Reading Data

The dashboard displays 4 main sections:

#### **1. Summary Statistics** (Top Cards)

**Metrics Displayed**:
- Total Books (by status: read, currently reading, to-read)
- Average Rating & Rating Distribution
- Reading Pace (books per month, reading streak)
- Year-over-Year Comparison

**Example**:
```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Total Books: 347     │  │ Avg Rating: 4.2 ⭐   │  │ Books/Month: 4.8     │
│ ✓ Read: 298          │  │ Most Common: 5 ⭐    │  │ Streak: 18 months    │
│ 📖 Reading: 3        │  │ Unrated: 62          │  │ 2024: 52 (+8% YoY)   │
│ 📚 To-Read: 46       │  │                      │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

#### **2. Reading Trends Over Time** (Charts)

**Charts Available**:
- **Reading Volume**: Books completed by month/quarter/year (line chart)
- **Rating Trends**: How your average rating changes over time (line chart)

**Interactions**:
- Hover over data points for details
- Toggle time granularity (monthly/quarterly/yearly)
- Identify peak and low reading periods

**What to Look For**:
- Seasonal patterns (do you read more in winter?)
- Rating trends (getting more/less critical over time?)
- Reading velocity changes

---

#### **3. Category Breakdowns** (Tabs)

**Tabs Available**:

1. **By Genre**:
   - Top genres (Fiction: 156 books, 52.3%)
   - Average rating per genre
   - Pie chart visualization

2. **By Author**:
   - Most-read authors
   - Total pages per author
   - Bar chart visualization

3. **By Publication Decade**:
   - Distribution (1950s: 12, 2000s: 89, 2020s: 134)
   - Classic vs. contemporary preference

4. **By Page Count**:
   - Short (<200 pages): 23 books
   - Medium (200-400 pages): 185 books
   - Long (400+ pages): 90 books

**Interactions**:
- Click on category to filter entire dashboard
- Sort by count, rating, or name

---

#### **4. Filters** (Left Sidebar)

**Available Filters**:

| Filter | Options |
|--------|---------|
| **Date Range** | Custom dates, Last 30/90/365 days, Current year, Previous year |
| **Rating Range** | Min/Max stars (1-5) or unrated books only |
| **Reading Status** | Read, Currently Reading, To-Read, or All |
| **Shelves** | Select from your custom Goodreads shelves (multi-select) |
| **Genres** | Select genres detected in your library (multi-select) |

**How Filters Work**:
- All filters are AND-combined (book must match all active filters)
- Shelves/Genres use OR logic (book on ANY selected shelf)
- Filters update all charts and statistics in real-time
- Click "Reset Filters" to clear all

**Example Use Cases**:
```
🔍 "What are my highest-rated sci-fi books from 2024?"
→ Filters: Date Range = 2024, Genres = ["Science Fiction"], Rating Min = 4

🔍 "Books on my 'favorites' shelf that I haven't read yet"
→ Filters: Shelves = ["favorites"], Status = "To-Read"

🔍 "How many books did I read in the last 3 months?"
→ Filters: Date Range = "Last 90 days", Status = "Read"
→ Result: Check "Total Books" stat
```

---

## Common Operations

### Reload Library Data (After Reading More Books)

1. Run the scraper again to export updated library
2. In dashboard, click "Upload Library" (top-right)
3. Select updated export folder
4. Dashboard replaces old data with new data

**Note**: This overwrites previous data. To keep historical snapshots, save multiple exports in separate folders.

---

### Stop the Application

```bash
# Stop containers (preserves data)
docker-compose stop

# Stop and remove containers (preserves data in volume)
docker-compose down

# Stop, remove containers, AND delete data (DESTRUCTIVE)
docker-compose down -v
```

---

### Restart the Application

```bash
# Start existing containers
docker-compose start

# Or rebuild and start (if code changed)
docker-compose up -d --build
```

---

### View Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 backend
```

---

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker-compose logs backend
```

**Common Issues**:
- **Port already in use**: Another app using port 3000 or 3001
  - Solution: Change `FRONTEND_PORT` or `BACKEND_PORT` in `.env`
- **Database connection failed**: Database not ready
  - Solution: Wait 10-15 seconds, then `docker-compose restart backend`

---

### Dashboard Shows "No Connection to Backend"

**Symptoms**:
- Frontend loads but shows API error
- Network tab shows failed requests to `http://localhost:3001`

**Fix**:
```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

**If backend won't start**:
- Check database is running: `docker-compose ps db`
- Check database logs: `docker-compose logs db`
- Verify `DATABASE_URL` in `.env`

---

### Upload Fails with "413 Payload Too Large"

**Cause**: Too many files uploaded at once (>100)

**Solution**:
1. Split library into batches of 50-100 files
2. Upload each batch separately
3. Or increase Nginx file size limit:
   ```nginx
   # frontend/nginx.conf
   client_max_body_size 50M;
   ```

---

### Charts Not Displaying

**Causes & Solutions**:

1. **No data with required fields**:
   - Trends require `dateFinished` on books
   - Genre breakdown requires `genres` array
   - Check uploaded data has these fields

2. **JavaScript Error**:
   - Open browser console (F12 → Console)
   - Check for React/Chart.js errors
   - Report issue with error details

3. **Slow Rendering**:
   - Large libraries (2000+ books) may take 2-3 seconds
   - Wait for loading indicators to complete

---

### Database Persistence

**Data Storage**:
- Database data stored in Docker volume: `dashboard_pgdata`
- Persists across container restarts
- NOT deleted by `docker-compose down` (only by `docker-compose down -v`)

**Backup Database**:
```bash
# Export database to SQL file
docker exec dashboard_db_1 pg_dump -U analytics_user analytics > backup.sql

# Restore from backup
cat backup.sql | docker exec -i dashboard_db_1 psql -U analytics_user analytics
```

---

### Reset Everything (Start Fresh)

```bash
# Stop containers, remove volumes (DESTRUCTIVE - deletes all data)
docker-compose down -v

# Remove images (forces rebuild)
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

---

## Performance Tips

### For Libraries >2000 Books

If your library exceeds 2000 books:

1. **Filter by Date Range**:
   - View last 2 years only: `Date Range = 2023-01-01 to now`
   - Reduces data processing load

2. **Increase Backend Memory**:
   ```yaml
   # docker-compose.yml
   backend:
     deploy:
       resources:
         limits:
           memory: 1G  # Increase from default
   ```

3. **Optimize Queries**:
   - Check PostgreSQL logs for slow queries
   - Add indexes if needed (see data-model.md)

---

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

---

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | nginx:alpine | 3000:80 | React SPA served by Nginx |
| `backend` | node:20-alpine | 3001:3001 | NestJS API server |
| `db` | postgres:15-alpine | 5432 (internal) | PostgreSQL database |

---

## API Access (Advanced)

### Swagger UI

When backend is running, access interactive API documentation:

```
http://localhost:3001/api/docs
```

**Features**:
- Explore all endpoints
- Test API calls directly
- View request/response schemas

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

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 86+ | ✅ Full support | Best experience |
| Edge | 86+ | ✅ Full support | Same as Chrome |
| Firefox | 50+ | ✅ Full support | Works well |
| Safari | 11.1+ | ✅ Full support | Works well |

**Unsupported**: Internet Explorer (use Edge instead)

---

## Next Steps

Once you're comfortable with the dashboard:

- **Analyze Reading Patterns**: Look for trends in your reading habits
- **Set Reading Goals**: Use year-over-year stats to track progress
- **Discover Preferences**: Find your favorite genres and authors
- **Diversify Reading**: Identify gaps in genres or publication decades
- **Share Insights**: Export charts as screenshots to share with book clubs

Happy reading! 📚

---

## Getting Help

**Issues**:
- Check `docker-compose logs` for error details
- Verify prerequisites (Docker, data format)
- Consult `/specs/002-analytics-dashboard/spec.md` for detailed requirements

**Feature Requests**:
- See `/specs/002-analytics-dashboard/spec.md` → "Out of Scope" for planned future features
