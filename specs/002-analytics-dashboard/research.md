# Research & Technology Decisions: Analytics Dashboard

**Feature**: 002-analytics-dashboard
**Date**: 2025-11-02
**Status**: Phase 0 Complete

## Overview

This document captures technology choices, best practices research, and architectural decisions for the Analytics Dashboard feature. The architecture consists of a React frontend, Node.js/NestJS backend, and PostgreSQL database, all deployed via Docker Compose.

---

## 1. Frontend Framework Selection

### Decision: React 18 + TypeScript + Vite

**Rationale**:
- **React 18**: Component-based architecture, excellent ecosystem for data visualization, hooks for state management
- **TypeScript 5.x**: Type safety for API contracts, better IDE support, catches errors at compile time
- **Vite 5.x**: Fast dev server with HMR, optimized production builds, modern ESM-based tooling

**Alternatives Considered**:

| Framework | Pros | Cons | Rejected Because |
|-----------|------|------|------------------|
| Vanilla JS | No build step, simple | Manual DOM manipulation, no type safety | Complex state management for filters + charts |
| Vue 3 | Simpler learning curve, composition API | Smaller ecosystem for charts | React has better chart library integrations |
| Angular | Full framework, TypeScript native | Heavy bundle, overkill for SPA | Too heavyweight for dashboard use case |
| Svelte | Smaller bundles, reactive | Less mature ecosystem | Limited NestJS integration patterns |

**Implementation Notes**:
- Use functional components with hooks (useState, useEffect, useMemo, useCallback)
- Custom hooks for data fetching (useLibrary, useAnalytics, useFilters)
- React Query or SWR for API state management (optional optimization)
- Axios for HTTP client with interceptors for error handling

**References**:
- [React Docs](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 2. Chart Library Selection

### Decision: react-chartjs-2 (Chart.js 4.x wrapper)

**Rationale**:
- **Performance**: Canvas-based rendering handles 2000+ data points efficiently
- **React Integration**: react-chartjs-2 provides React components wrapping Chart.js
- **Bundle Size**: ~65KB for Chart.js + ~5KB for react-chartjs-2 wrapper
- **Type Safety**: Full TypeScript definitions available (@types/chart.js)
- **Declarative API**: Pass data/options as props, React handles updates

**Alternatives Considered**:

| Library | Pros | Cons | Rejected Because |
|---------|------|------|------------------|
| Recharts | Built for React, composable | SVG rendering slower at scale | Canvas better for 2000+ points |
| Victory | React-native compatible | Large bundle, heavyweight | Chart.js lighter and faster |
| Nivo | Beautiful defaults, responsive | Opinionated styling | Less customization flexibility |
| D3.js | Maximum control | No React wrapper, manual integration | Overkill for standard chart types |

**Implementation Pattern**:

```tsx
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function ReadingTrendChart({ data }: { data: ChartData }) {
  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: { decimation: { enabled: true, algorithm: 'lttb' } }
      }}
    />
  );
}
```

**Performance Optimizations**:
- Enable data decimation plugin for time-series with >500 points (LTTB algorithm)
- Use React.memo() to prevent unnecessary chart re-renders
- Lazy load chart components with React.lazy() and Suspense

**Reference**: [react-chartjs-2 Documentation](https://react-chartjs-2.js.org/)

---

## 3. Backend Framework Selection

### Decision: Node.js 20 LTS + NestJS 10+

**Rationale**:
- **Node.js 20 LTS**: Long-term support, native TypeScript integration, matches frontend language
- **NestJS**: TypeScript-first, modular architecture (controllers → services → entities), built-in validation
- **Developer Experience**: Auto-generated Swagger/OpenAPI docs, CLI tooling, extensive decorators
- **Ecosystem**: Excellent TypeORM integration, Multer for file uploads, built-in dependency injection

**Alternatives Considered**:

| Framework | Pros | Cons | Rejected Because |
|-----------|------|------|------------------|
| Express.js | Minimal, flexible, widely used | No structure, manual setup for validation/docs | NestJS provides enterprise structure |
| Fastify | Faster than Express, schema validation | Less opinionated, smaller ecosystem | NestJS built on Fastify optionally anyway |
| Python/FastAPI | Modern, auto-docs, Pydantic validation | Different language from frontend | User requested Node.js backend |
| Go/Fiber | Excellent performance | Compiled language, different ecosystem | TypeScript consistency preferred |

**NestJS Architecture**:

```
src/
├── main.ts                      # Bootstrap application
├── app.module.ts                # Root module
├── config/                      # Configuration (database, CORS)
├── entities/                    # TypeORM database entities
├── dto/                         # Data Transfer Objects (class-validator)
├── controllers/                 # Route handlers (@Controller)
├── services/                    # Business logic (@Injectable)
└── utils/                       # Helpers (logging, validators)
```

**Key Features**:
- **Dependency Injection**: Services injected into controllers automatically
- **Validation Pipes**: class-validator DTOs validate requests at entry point
- **Exception Filters**: Global error handling with structured responses
- **Interceptors**: Request/response logging, trace IDs, performance metrics
- **Swagger Module**: Auto-generated API documentation via decorators

**Reference**: [NestJS Documentation](https://docs.nestjs.com/)

---

## 4. Database & ORM Selection

### Decision: PostgreSQL 15+ with TypeORM 0.3+

**Rationale**:
- **PostgreSQL**: ACID compliance, JSON support, excellent indexing, handles analytics queries efficiently
- **TypeORM**: Active Record + Data Mapper patterns, TypeScript-native, migration CLI, NestJS integration
- **Scalability**: Supports 2000+ books per library with proper indexing, designed for future multi-library feature

**Alternatives Considered**:

| Database | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| MongoDB | Flexible schema, JSON-native | Less efficient for aggregations | Analytics requires relational queries |
| SQLite | Embedded, no server | Limited concurrency | Docker deployment needs proper RDBMS |
| MySQL | Mature, widely used | Weaker JSON support than Postgres | PostgreSQL better for analytics |

**Schema Design** (simplified):

```typescript
@Entity('books')
class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ type: 'enum', enum: ['read', 'currently-reading', 'to-read'] })
  status: string;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'date', nullable: true })
  dateFinished: Date | null;

  @ManyToOne(() => Library, library => library.books)
  library: Library;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Indexing Strategy**:
- `CREATE INDEX idx_books_status ON books(status);`
- `CREATE INDEX idx_books_rating ON books(rating);`
- `CREATE INDEX idx_books_date_finished ON books(date_finished);`
- `CREATE INDEX idx_books_library_id ON books(library_id);`

**Migration Workflow**:
- TypeORM CLI: `npm run migration:generate -- -n InitialSchema`
- Migrations versioned in `src/migrations/` directory
- Run migrations: `npm run migration:run`

**Reference**: [TypeORM Documentation](https://typeorm.io/)

---

## 5. File Upload Strategy

### Decision: Multipart form upload with Multer middleware

**Rationale**:
- **Standard Approach**: Multipart/form-data is HTTP standard for file uploads
- **Multer Integration**: NestJS built-in support via `@UseInterceptors(FilesInterceptor())`
- **Memory Efficiency**: Stream files to disk/memory, parse incrementally
- **Validation**: File type, size limits enforced before parsing

**Implementation Pattern**:

```typescript
@Controller('api/library')
export class LibraryController {
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 100)) // Max 100 files
  async uploadLibrary(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: Request
  ) {
    return this.libraryService.processUpload(files, req.user);
  }
}
```

**Upload Processing**:
1. Receive files from frontend (multiple JSON files)
2. Validate file type (application/json) and size (<5MB per file)
3. Parse JSON in batches (50-100 files at a time to avoid memory spikes)
4. Validate each book object with class-validator DTOs
5. Bulk insert into database using TypeORM's `repository.save(books)`
6. Return upload summary (books imported, errors encountered)

**Error Handling**:
- Invalid JSON: Skip file, log error, include in error summary
- Missing required fields: Skip book, log warning
- Database insert failure: Rollback transaction, return error response

**Reference**: [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

---

## 6. Docker Containerization Strategy

### Decision: Docker Compose with 3 services (frontend, backend, database)

**Rationale**:
- **Consistency**: Dev/prod parity, eliminates "works on my machine"
- **Isolation**: Each service in separate container with defined dependencies
- **Orchestration**: docker-compose.yml defines service relationships, networking, volumes
- **Deployment**: Single command (`docker-compose up`) starts entire stack

**Service Architecture**:

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/analytics
    depends_on: [db]

  db:
    image: postgres:15-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
```

**Dockerfile Patterns**:

**Frontend** (multi-stage build):
```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Backend**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "dist/main.js"]
EXPOSE 3001
```

**Volume Management**:
- `pgdata`: Persistent storage for PostgreSQL data
- No volumes for frontend/backend (stateless, ephemeral)

**Network**:
- Default bridge network created by docker-compose
- Services resolve by service name (backend calls `http://db:5432`)

**Reference**: [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## 7. API Design & Contract Management

### Decision: RESTful API with OpenAPI/Swagger documentation

**Endpoints**:

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/library/upload` | Upload library files | `multipart/form-data` | `UploadResponseDto` |
| GET | `/api/analytics/summary` | Get summary statistics | Query: `FilterRequestDto` | `AnalyticsSummaryDto` |
| GET | `/api/analytics/trends` | Get reading trends | Query: `FilterRequestDto` | `TrendDataDto` |
| GET | `/api/analytics/categories` | Get category breakdowns | Query: `FilterRequestDto` | `CategoryDataDto` |
| GET | `/api/health` | Health check | - | `{ status: "ok" }` |

**DTO Pattern** (class-validator):

```typescript
export class FilterRequestDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateEnd?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingMin?: number;

  @IsOptional()
  @IsEnum(['read', 'currently-reading', 'to-read'])
  status?: string;
}
```

**Swagger Integration**:

```typescript
@ApiTags('analytics')
@Controller('api/analytics')
export class AnalyticsController {
  @Get('summary')
  @ApiOperation({ summary: 'Get library summary statistics' })
  @ApiQuery({ name: 'dateStart', required: false, type: Date })
  @ApiResponse({ status: 200, type: AnalyticsSummaryDto })
  async getSummary(@Query() filters: FilterRequestDto) {
    return this.analyticsService.getSummary(filters);
  }
}
```

**Contract Testing**:
- OpenAPI schema auto-generated at `/api/docs`
- Frontend TypeScript types generated from OpenAPI spec (openapi-generator)
- Contract tests verify request/response match DTOs

**Reference**: [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)

---

## 8. Performance Optimization Strategy

### Decision: Database query optimization + API response caching

**Target**: <500ms API response time for 2000 books (FR-029)

**Techniques**:

1. **Database Indexing** (covered in Section 4):
   - Indexes on filter columns (status, rating, dateFinished, libraryId)
   - Composite indexes for common filter combinations

2. **Query Optimization**:
   - Use TypeORM's `select()` to fetch only required fields
   - Aggregate in database (SQL `COUNT`, `AVG`, `GROUP BY`) vs application code
   - Example: `SELECT genre, COUNT(*) FROM books WHERE library_id = ? GROUP BY genre`

3. **Connection Pooling**:
   - PostgreSQL connection pool (TypeORM default: 10 connections)
   - Reuse connections across requests

4. **Response Caching** (optional):
   - NestJS Cache Interceptor for GET endpoints
   - Cache key: `analytics:summary:${userId}:${filterHash}`
   - TTL: 5 minutes (balance freshness vs performance)

5. **Frontend Optimizations**:
   - Debounce filter changes (300ms) before API call
   - React Query caching for recently fetched data
   - Lazy load charts with React.lazy() + Suspense

**Performance Testing**:
- Load testing with 2000-book dataset
- Artillery.io or k6 for API endpoint benchmarking
- PostgreSQL `EXPLAIN ANALYZE` for query optimization

**Reference**: [NestJS Performance](https://docs.nestjs.com/techniques/performance)

---

## 9. Error Handling & Logging

### Decision: Structured logging (Winston/Pino) + NestJS exception filters

**Backend Logging** (FR-027):

```typescript
// logger.ts
import * as winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Usage in service
this.logger.info('Processing file upload', {
  userId: user.id,
  fileCount: files.length,
  traceId: req.traceId
});
```

**Log Levels**:
- `error`: Parse failures, database errors, uncaught exceptions
- `warn`: Skipped books, missing optional fields
- `info`: Request start/end, file processing progress, performance metrics
- `debug`: Detailed calculation logs, SQL queries (dev only)

**Exception Filters**:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus?.() || 500;

    this.logger.error('Request failed', {
      statusCode: status,
      message: exception.message,
      stack: exception.stack
    });

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

**Frontend Error Display**:
- Toast notifications for API errors
- Banner for validation errors during upload
- Console logging for debugging (FR-027 frontend console logging)

**Reference**: [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)

---

## 10. Security & Validation

### Decision: Defense in depth (DTO validation + DB constraints)

**Request Validation** (class-validator):
- All DTOs validated with decorators (@IsString, @IsInt, @IsEnum, etc.)
- ValidationPipe globally enabled in main.ts
- Failed validation returns 400 Bad Request with field errors

**File Upload Security**:
- File type whitelist: `application/json` only
- File size limit: 5MB per file, 100 files max per upload
- Sanitize filenames to prevent directory traversal

**Database Constraints**:
- NOT NULL for required fields (title, author, status)
- CHECK constraints (rating BETWEEN 1 AND 5)
- Foreign key constraints (books.library_id → libraries.id)

**CORS Configuration**:
- Allow frontend origin only: `http://localhost:3000` (dev), production domain
- Allow credentials for session cookies

**Session Management** (MVP):
- Express session middleware with PostgreSQL session store
- HTTP-only, secure cookies
- No multi-user authentication in MVP (future: Passport.js + JWT)

**Reference**: [NestJS Security](https://docs.nestjs.com/security/authentication)

---

## Research Summary

| Topic | Decision | Key Technologies |
|-------|----------|-----------------|
| Frontend Framework | React 18 + TypeScript + Vite | React, Vite, TypeScript |
| Chart Library | react-chartjs-2 (Chart.js 4.x) | Chart.js, react-chartjs-2 |
| Backend Framework | Node.js 20 + NestJS 10+ | NestJS, Express |
| Database & ORM | PostgreSQL 15 + TypeORM 0.3+ | PostgreSQL, TypeORM |
| File Upload | Multipart form with Multer | Multer middleware |
| Deployment | Docker Compose (3 services) | Docker, docker-compose |
| API Design | RESTful with OpenAPI/Swagger | Swagger, class-validator |
| Performance | DB indexing + query optimization | PostgreSQL indexes |
| Logging | Structured JSON logs (Winston) | Winston/Pino |
| Security | DTO validation + DB constraints | class-validator, TypeORM |

**Key References**:
- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

## Open Questions / Future Considerations

None. All technical decisions resolved for MVP. Future enhancements (post-MVP):
- Horizontal scaling with load balancer (multiple backend containers)
- Read replicas for PostgreSQL (analytics queries on replica, writes on primary)
- Redis caching layer for frequently accessed analytics
- GraphQL API for flexible data querying
- WebSocket support for real-time updates (e.g., upload progress)
- User authentication with OAuth (Google, GitHub)
- Multi-library support UI/UX (database schema already supports this)
