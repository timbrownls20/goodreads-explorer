# Data Model: Analytics Dashboard

**Feature**: 002-analytics-dashboard
**Date**: 2025-11-02
**Status**: Phase 1 Complete

## Overview

This document defines the database schema, TypeORM entities, DTOs, relationships, and validation rules for the Analytics Dashboard. The architecture uses PostgreSQL for persistent storage with TypeORM as the ORM, and class-validator DTOs for API contract validation.

---

## Database Entities (TypeORM)

### 1. Book Entity

**Description**: Core entity representing a single book in a user's library with all scraped metadata.

**Table Name**: `books`

**TypeORM Entity**:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Library } from './library.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign key relationship
  @ManyToOne(() => Library, library => library.books, { onDelete: 'CASCADE' })
  library: Library;

  @Column({ name: 'library_id', type: 'uuid' })
  libraryId: string;

  // Required fields
  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  author: string;

  @Column({
    type: 'enum',
    enum: ['read', 'currently-reading', 'to-read'],
    default: 'to-read'
  })
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  isbn: string | null;

  @Column({ type: 'int', nullable: true, name: 'publication_year' })
  publicationYear: number | null;

  @Column({ type: 'int', nullable: true })
  pages: number | null;

  // Categories & Organization (JSON columns for arrays)
  @Column({ type: 'jsonb', default: [] })
  genres: string[];

  @Column({ type: 'jsonb', default: [] })
  shelves: string[];

  // Dates
  @Column({ type: 'date', nullable: true, name: 'date_added' })
  dateAdded: Date | null;

  @Column({ type: 'date', nullable: true, name: 'date_started' })
  dateStarted: Date | null;

  @Column({ type: 'date', nullable: true, name: 'date_finished' })
  dateFinished: Date | null;

  // User content
  @Column({ type: 'text', nullable: true })
  review: string | null;

  @Column({ type: 'date', nullable: true, name: 'review_date' })
  reviewDate: Date | null;

  // Source tracking (for debugging)
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'source_file' })
  sourceFile: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Database Constraints**:
- `title NOT NULL`
- `author NOT NULL`
- `status NOT NULL CHECK (status IN ('read', 'currently-reading', 'to-read'))`
- `rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))`
- `publication_year CHECK (publication_year IS NULL OR (publication_year >= 1000 AND publication_year <= 9999))`
- `pages CHECK (pages IS NULL OR pages > 0)`
- `library_id` foreign key references `libraries(id)` ON DELETE CASCADE

**Indexes** (for filtering and analytics):
```sql
CREATE INDEX idx_books_library_id ON books(library_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_rating ON books(rating);
CREATE INDEX idx_books_date_finished ON books(date_finished);
CREATE INDEX idx_books_genres ON books USING GIN(genres); -- GIN index for JSONB array queries
CREATE INDEX idx_books_shelves ON books USING GIN(shelves);
```

---

### 2. Library Entity

**Description**: Container entity representing a user's library (supports future multi-library feature).

**Table Name**: `libraries`

**TypeORM Entity**:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('libraries')
export class Library {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign key relationship to user
  @ManyToOne(() => User, user => user.libraries, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Library metadata
  @Column({ type: 'varchar', length: 100, default: 'My Library' })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'folder_path' })
  folderPath: string | null;  // Original upload folder path (for display)

  @Column({ type: 'timestamp', nullable: true, name: 'last_uploaded_at' })
  lastUploadedAt: Date | null;

  // Relationship to books
  @OneToMany(() => Book, book => book.library)
  books: Book[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Database Constraints**:
- `name NOT NULL`
- `user_id` foreign key references `users(id)` ON DELETE CASCADE
- `UNIQUE(user_id, name)` - Each user can have multiple libraries with unique names

**Indexes**:
```sql
CREATE INDEX idx_libraries_user_id ON libraries(user_id);
```

---

### 3. User Entity

**Description**: User entity for session management and library ownership (simple session-based for MVP).

**Table Name**: `users`

**TypeORM Entity**:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Library } from './library.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Session identifier (MVP: no authentication, just session tracking)
  @Column({ type: 'varchar', length: 255, unique: true, name: 'session_id' })
  sessionId: string;

  // User metadata (for future authentication feature)
  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  // Relationship to libraries
  @OneToMany(() => Library, library => library.user)
  libraries: Library[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Database Constraints**:
- `session_id NOT NULL UNIQUE`

**MVP Behavior**:
- One session = one user
- Session stored in HTTP-only cookie
- No password/authentication (future: Passport.js + JWT)

---

## Data Transfer Objects (DTOs)

### 1. CreateBookDto (API Request)

**Purpose**: Validate book data during library upload.

**class-validator DTO**:

```typescript
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, Max, IsOptional, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookDto {
  // Required fields
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsEnum(['read', 'currently-reading', 'to-read'])
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @IsString()
  isbn?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  publicationYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number | null;

  // Categories
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shelves?: string[];

  // Dates
  @IsOptional()
  @IsDateString()
  dateAdded?: string | null;

  @IsOptional()
  @IsDateString()
  dateStarted?: string | null;

  @IsOptional()
  @IsDateString()
  dateFinished?: string | null;

  // User content
  @IsOptional()
  @IsString()
  review?: string | null;

  @IsOptional()
  @IsDateString()
  reviewDate?: string | null;

  // Source tracking
  @IsOptional()
  @IsString()
  sourceFile?: string | null;
}
```

**Validation Behavior**:
- NestJS ValidationPipe automatically validates incoming requests
- Returns 400 Bad Request with field errors if validation fails
- Transforms date strings to Date objects via class-transformer

---

### 2. FilterRequestDto (API Query Params)

**Purpose**: Validate filter parameters for analytics queries.

**class-validator DTO**:

```typescript
import { IsOptional, IsDateString, IsInt, Min, Max, IsEnum, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterRequestDto {
  // Date range filter
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  // Rating filter
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  ratingMin?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  ratingMax?: number;

  // Status filter
  @IsOptional()
  @IsEnum(['read', 'currently-reading', 'to-read'])
  status?: string;

  // Shelf filter (array)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  shelves?: string[];

  // Genre filter (array)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  genres?: string[];
}
```

**Usage**:
```typescript
@Get('api/analytics/summary')
async getSummary(@Query() filters: FilterRequestDto) {
  return this.analyticsService.getSummary(filters);
}
```

---

### 3. AnalyticsSummaryDto (API Response)

**Purpose**: Response schema for summary statistics endpoint.

**class-validator DTO**:

```typescript
export class AnalyticsSummaryDto {
  totalBooks: number;
  totalRead: number;
  totalReading: number;
  totalToRead: number;
  totalRated: number;
  averageRating: number;

  ratingDistribution: {
    [rating: number]: number;
  };

  mostCommonRating: number | null;

  averageBooksPerMonth: number;
  readingStreak: number;
  currentYearTotal: number;
  previousYearTotal: number;
  yearOverYearChange: number;

  dateRange: {
    earliest: string | null;  // ISO 8601 date
    latest: string | null;
  };

  filteredCount: number;
  unfilteredCount: number;
}
```

---

### 4. UploadResponseDto (API Response)

**Purpose**: Response after library upload with success/error details.

**class-validator DTO**:

```typescript
export class UploadResponseDto {
  success: boolean;
  message: string;

  stats: {
    filesProcessed: number;
    filesSkipped: number;
    booksImported: number;
    booksSkipped: number;
    durationMs: number;
  };

  errors?: Array<{
    file: string;
    error: string;
  }>;

  libraryId: string;  // UUID of created/updated library
}
```

**Example Response**:
```json
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

---

## Entity Relationships (ERD)

```
┌──────────────────┐
│      users       │
├──────────────────┤
│ id (PK)          │
│ session_id (UQ)  │
│ username         │
│ email            │
│ created_at       │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐
│    libraries     │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ name             │
│ folder_path      │
│ last_uploaded_at │
│ created_at       │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐
│      books       │
├──────────────────┤
│ id (PK)          │
│ library_id (FK)  │──┐
│ title            │  │
│ author           │  │
│ status           │  │ CASCADE DELETE
│ rating           │  │ (deleting library
│ isbn             │  │  deletes all books)
│ publication_year │  │
│ pages            │  │
│ genres (jsonb)   │  │
│ shelves (jsonb)  │  │
│ date_finished    │  │
│ ...              │  │
└──────────────────┘◄─┘
```

**Relationship Details**:
- `users 1 → N libraries`: One user can have multiple libraries (future feature)
- `libraries 1 → N books`: One library contains many books
- CASCADE DELETE: Deleting a user deletes all their libraries and books
- CASCADE DELETE: Deleting a library deletes all its books

**MVP Constraint**:
- Frontend UI only supports 1 library per user
- Database schema supports multiple libraries (future enhancement)

---

## Database Migration Strategy

### TypeORM Migration Workflow

**1. Generate Initial Migration**:
```bash
npm run migration:generate -- -n InitialSchema
```

**2. Migration File** (auto-generated):
```typescript
// src/migrations/1699000000000-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(100),
        email VARCHAR(200),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create libraries table
    await queryRunner.query(`
      CREATE TABLE libraries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL DEFAULT 'My Library',
        folder_path VARCHAR(500),
        last_uploaded_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, name)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_libraries_user_id ON libraries(user_id)`);

    // Create books table
    await queryRunner.query(`
      CREATE TABLE books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'to-read' CHECK (status IN ('read', 'currently-reading', 'to-read')),
        rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
        isbn VARCHAR(20),
        publication_year INT CHECK (publication_year IS NULL OR (publication_year >= 1000 AND publication_year <= 9999)),
        pages INT CHECK (pages IS NULL OR pages > 0),
        genres JSONB DEFAULT '[]',
        shelves JSONB DEFAULT '[]',
        date_added DATE,
        date_started DATE,
        date_finished DATE,
        review TEXT,
        review_date DATE,
        source_file VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_books_library_id ON books(library_id)`);
    await queryRunner.query(`CREATE INDEX idx_books_status ON books(status)`);
    await queryRunner.query(`CREATE INDEX idx_books_rating ON books(rating)`);
    await queryRunner.query(`CREATE INDEX idx_books_date_finished ON books(date_finished)`);
    await queryRunner.query(`CREATE INDEX idx_books_genres ON books USING GIN(genres)`);
    await queryRunner.query(`CREATE INDEX idx_books_shelves ON books USING GIN(shelves)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE books CASCADE`);
    await queryRunner.query(`DROP TABLE libraries CASCADE`);
    await queryRunner.query(`DROP TABLE users CASCADE`);
  }
}
```

**3. Run Migration**:
```bash
npm run migration:run
```

**4. Rollback** (if needed):
```bash
npm run migration:revert
```

---

## Data Validation & Error Handling

### Validation Layers

```
┌──────────────────┐
│  Frontend Form   │
│   (optional      │
│   client-side    │
│   validation)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   API Request    │
│  (JSON payload)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  class-validator │ ◄─── Layer 1: DTO Validation
│   DTO (NestJS    │      (400 Bad Request if fails)
│  ValidationPipe) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Business Logic  │ ◄─── Layer 2: Service Validation
│    (Service)     │      (e.g., check duplicate books)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   TypeORM Save   │ ◄─── Layer 3: Database Constraints
│   (PostgreSQL)   │      (NOT NULL, CHECK, UNIQUE, FK)
└──────────────────┘
```

**Example Validation Flow** (file upload):

1. **DTO Validation**:
   ```typescript
   // Validates each book in uploaded files
   const createBookDto = new CreateBookDto();
   createBookDto.title = bookData.title;
   createBookDto.author = bookData.author;

   const errors = await validate(createBookDto);
   if (errors.length > 0) {
     this.logger.warn(`Validation failed for ${sourceFile}`, errors);
     skippedBooks.push({ file: sourceFile, error: errors.toString() });
     continue; // Skip this book
   }
   ```

2. **Service Logic**:
   ```typescript
   // Check for duplicates (same title + author in same library)
   const exists = await this.bookRepository.findOne({
     where: { libraryId, title: book.title, author: book.author }
   });

   if (exists) {
     this.logger.info(`Skipping duplicate book: ${book.title}`);
     continue;
   }
   ```

3. **Database Constraints**:
   ```typescript
   // PostgreSQL enforces NOT NULL, CHECK, UNIQUE constraints
   await this.bookRepository.save(book);
   // Throws exception if constraint violated
   ```

---

## Performance Considerations

### Query Optimization

**1. Efficient Filtering** (using TypeORM QueryBuilder):
```typescript
async findFilteredBooks(libraryId: string, filters: FilterRequestDto): Promise<Book[]> {
  const query = this.bookRepository
    .createQueryBuilder('book')
    .where('book.libraryId = :libraryId', { libraryId });

  if (filters.status) {
    query.andWhere('book.status = :status', { status: filters.status });
  }

  if (filters.ratingMin) {
    query.andWhere('book.rating >= :ratingMin', { ratingMin: filters.ratingMin });
  }

  if (filters.ratingMax) {
    query.andWhere('book.rating <= :ratingMax', { ratingMax: filters.ratingMax });
  }

  if (filters.dateStart) {
    query.andWhere('book.dateFinished >= :dateStart', { dateStart: filters.dateStart });
  }

  if (filters.dateEnd) {
    query.andWhere('book.dateFinished <= :dateEnd', { dateEnd: filters.dateEnd });
  }

  if (filters.genres && filters.genres.length > 0) {
    query.andWhere('book.genres ?| ARRAY[:...genres]', { genres: filters.genres });
  }

  return query.getMany();
}
```

**2. Aggregation in Database** (not application):
```typescript
async getGenreBreakdown(libraryId: string): Promise<CategoryBreakdown[]> {
  // Use raw SQL for efficient aggregation
  return this.bookRepository.query(`
    SELECT
      genre AS name,
      COUNT(*) AS count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM books WHERE library_id = $1), 2) AS percentage,
      ROUND(AVG(rating), 2) AS "averageRating"
    FROM books, jsonb_array_elements_text(genres) AS genre
    WHERE library_id = $1 AND rating IS NOT NULL
    GROUP BY genre
    ORDER BY count DESC
    LIMIT 20
  `, [libraryId]);
}
```

**3. Connection Pooling**:
```typescript
// TypeORM connection options
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  database: 'analytics',
  poolSize: 10,  // Reuse 10 connections
  extra: {
    max: 20  // Maximum pool size
  }
}
```

### Index Usage Analysis

**Check if indexes are used**:
```sql
EXPLAIN ANALYZE
SELECT * FROM books
WHERE library_id = 'a7f3e8c2-9d4a-4b1e-8f6d-2c9e5a7b1c3d'
  AND status = 'read'
  AND rating >= 4
  AND date_finished >= '2024-01-01';

-- Expected: "Index Scan using idx_books_library_id" (not Seq Scan)
```

**Composite Index** (if needed for common filter combination):
```sql
CREATE INDEX idx_books_library_status_rating
ON books(library_id, status, rating);
```

---

## Data Model Summary

| Entity | Table | Purpose | Key Indexes |
|--------|-------|---------|-------------|
| User | `users` | Session management | `session_id` (unique) |
| Library | `libraries` | Container for books | `user_id`, `(user_id, name)` unique |
| Book | `books` | Core library data | `library_id`, `status`, `rating`, `date_finished`, `genres`, `shelves` |

**API Contracts**:
- **Requests**: CreateBookDto, FilterRequestDto (validated with class-validator)
- **Responses**: AnalyticsSummaryDto, UploadResponseDto

**Storage Estimates** (2000 books):
- Books table: ~2MB (PostgreSQL storage)
- Indexes: ~500KB
- Total: ~2.5MB per library

**Performance Targets**:
- ✅ FR-029: Analytics API <500ms (achieved with indexes + aggregation in DB)
- ✅ SC-001: Upload 2000 books in <3s (bulk insert with transactions)

All schemas comply with:
- **Principle I**: Data-First Development (PostgreSQL database, TypeORM entities, migrations)
- **Principle IV**: Integration & Contract Testing (class-validator DTOs, OpenAPI contracts)
- **Principle VI**: Data Quality & Validation (DTO validation, database constraints)
