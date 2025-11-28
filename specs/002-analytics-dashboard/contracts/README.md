# API Contracts

**Feature**: 002-analytics-dashboard
**Date**: 2025-11-02
**Architecture**: React Frontend + NestJS Backend + PostgreSQL

## Overview

API contracts for the Analytics Dashboard are defined using **class-validator DTOs** in the NestJS backend, NOT JSON Schemas. NestJS automatically generates OpenAPI/Swagger documentation from these DTOs, ensuring a single source of truth.

---

## Contract Definition Approach

### ✅ **Source of Truth: NestJS class-validator DTOs**

All API contracts are defined as TypeScript classes with validation decorators in the backend:

```typescript
// backend/src/dto/filter-request.dto.ts
export class FilterRequestDto {
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingMin?: number;

  // ... more fields
}
```

**Location**: `/specs/002-analytics-dashboard/data-model.md` (Section: Data Transfer Objects)

**Benefits**:
- **Validation**: Automatic request validation at API entry point
- **Type Safety**: Full TypeScript support
- **Documentation**: Auto-generated OpenAPI/Swagger
- **Single Source**: DTOs define both validation rules and API contracts

---

## API Endpoints & Contracts

### 1. **POST /api/library/upload**

**Description**: Upload library data (multiple JSON files from scraper)

**Request**:
- Content-Type: `multipart/form-data`
- Field: `files` (array of JSON files, max 100)
- Each file contains book data validated against `CreateBookDto`

**Response**: `UploadResponseDto`
```typescript
{
  success: boolean;
  message: string;
  stats: {
    filesProcessed: number;
    filesSkipped: number;
    booksImported: number;
    booksSkipped: number;
    durationMs: number;
  };
  errors?: Array<{ file: string; error: string }>;
  libraryId: string;  // UUID
}
```

**DTO Reference**: `CreateBookDto`, `UploadResponseDto` in data-model.md

---

### 2. **GET /api/analytics/summary**

**Description**: Get library summary statistics with optional filters

**Query Parameters**: `FilterRequestDto`
```typescript
{
  dateStart?: string;      // ISO 8601 date
  dateEnd?: string;        // ISO 8601 date
  ratingMin?: number;      // 1-5
  ratingMax?: number;      // 1-5
  status?: string;         // 'read' | 'currently-reading' | 'to-read'
  shelves?: string[];      // Array of shelf names
  genres?: string[];       // Array of genre names
}
```

**Response**: `AnalyticsSummaryDto`
```typescript
{
  totalBooks: number;
  totalRead: number;
  totalReading: number;
  totalToRead: number;
  totalRated: number;
  averageRating: number;
  ratingDistribution: { [rating: number]: number };
  mostCommonRating: number | null;
  averageBooksPerMonth: number;
  readingStreak: number;
  currentYearTotal: number;
  previousYearTotal: number;
  yearOverYearChange: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  filteredCount: number;
  unfilteredCount: number;
}
```

**DTO Reference**: `FilterRequestDto`, `AnalyticsSummaryDto` in data-model.md

---

### 3. **GET /api/analytics/trends**

**Description**: Get reading trends over time (monthly/quarterly/yearly)

**Query Parameters**: `FilterRequestDto` (same as summary)

**Response**: `TrendDataDto` (to be defined in implementation)

---

### 4. **GET /api/analytics/categories**

**Description**: Get category breakdowns (genres, authors, decades, page count)

**Query Parameters**: `FilterRequestDto` (same as summary)

**Response**: `CategoryDataDto` (to be defined in implementation)

---

### 5. **GET /api/health**

**Description**: Health check endpoint

**Response**:
```typescript
{
  status: "ok";
  timestamp: string;
  database: "connected" | "disconnected";
}
```

---

## Accessing API Documentation

### **Live Swagger UI** (when backend is running):

```bash
# Start the backend
cd dashboard/backend
npm run start:dev

# Access Swagger UI
open http://localhost:3001/api/docs
```

The Swagger UI provides:
- Interactive API explorer
- Request/response schemas
- Example payloads
- "Try it out" functionality

---

## Generating OpenAPI Spec

### **Export OpenAPI JSON** (for frontend type generation):

```bash
cd dashboard/backend

# Generate openapi.json
npm run build
node dist/main.js --export-openapi

# Output: openapi.json (auto-generated from DTOs)
```

### **Generate Frontend Types** (optional):

```bash
cd dashboard/frontend

# Install openapi-typescript
npm install --save-dev openapi-typescript

# Generate TypeScript types from OpenAPI spec
npx openapi-typescript ../backend/openapi.json --output src/types/api.ts
```

This creates type-safe API client interfaces matching the backend DTOs.

---

## Contract Testing

### **Backend Contract Tests** (Jest):

```typescript
// backend/test/api/library.controller.spec.ts
describe('POST /api/library/upload', () => {
  it('should validate CreateBookDto schema', async () => {
    const invalidBook = { title: '', author: 'Test' }; // Missing title
    const response = await request(app).post('/api/library/upload')
      .attach('files', Buffer.from(JSON.stringify(invalidBook)));

    expect(response.status).toBe(400); // Validation error
    expect(response.body.message).toContain('title should not be empty');
  });
});
```

### **Frontend Contract Tests** (Vitest):

```typescript
// frontend/test/services/library.test.ts
import { UploadResponseDto } from '@/types/api';

it('should match UploadResponseDto contract', () => {
  const response: UploadResponseDto = {
    success: true,
    message: 'Upload complete',
    stats: { filesProcessed: 10, booksImported: 10, /* ... */ },
    libraryId: 'uuid'
  };

  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('libraryId');
});
```

---

## Contract Evolution

### **Adding New Fields to DTOs**:

1. Update DTO class in `backend/src/dto/`
2. Add validation decorators (`@IsOptional()`, `@IsString()`, etc.)
3. Add Swagger decorators (`@ApiProperty()` for documentation)
4. Run backend - OpenAPI spec auto-updates
5. Regenerate frontend types (if using openapi-typescript)

**Example**:
```typescript
export class FilterRequestDto {
  // Existing fields...

  // New field (backward-compatible with @IsOptional)
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Search query string', required: false })
  search?: string;
}
```

### **Versioning** (future):

- API version in URL: `/api/v1/analytics/summary` → `/api/v2/analytics/summary`
- Separate DTO classes per version: `FilterRequestDtoV1`, `FilterRequestDtoV2`

---

## Migration from JSON Schemas

**Old Approach** (client-only):
- JSON Schemas in `contracts/` directory
- Client-side validation only
- Manual schema maintenance

**New Approach** (fullstack):
- class-validator DTOs in backend
- Backend validates all requests (security)
- OpenAPI auto-generated (no manual sync)
- Frontend types generated from OpenAPI (optional)

**Obsolete Files** (no longer used):
- ❌ `library-dataset.schema.json` - Replaced by `CreateBookDto` + `UploadResponseDto`
- ❌ `filter-state.schema.json` - Replaced by `FilterRequestDto`
- ❌ `localstorage-schema.json` - Not needed (using PostgreSQL database)

---

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Contract Definition** | NestJS class-validator DTOs |
| **Documentation** | Auto-generated OpenAPI/Swagger at `/api/docs` |
| **Validation** | Backend enforces DTOs via ValidationPipe |
| **Frontend Types** | Optional: Generate from OpenAPI or write manually |
| **Testing** | Contract tests verify DTO schemas in Jest/Vitest |
| **Source of Truth** | `/specs/002-analytics-dashboard/data-model.md` (DTO section) |

**Key Principle**: DTOs are code, not documentation. They enforce contracts at runtime and generate documentation automatically.
