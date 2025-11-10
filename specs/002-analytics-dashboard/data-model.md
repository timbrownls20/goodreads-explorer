# Data Model: Analytics Dashboard

**Feature**: 002-analytics-dashboard
**Date**: 2025-11-02
**Status**: Phase 1-3 Complete (Backend models, import, basic analytics)
**Last Updated**: 2025-11-10

## Overview

This document defines the database schema, Sequelize models, DTOs, relationships, and validation rules for the Analytics Dashboard. The architecture uses PostgreSQL for persistent storage with Sequelize as the ORM, and class-validator DTOs for API contract validation.

**Key Architecture Decisions**:
- **ORM**: Sequelize (not TypeORM as originally planned)
- **Data Structure**: Normalized tables for genres, shelves, and literary awards (not JSONB arrays)
- **Library Model**: Globally unique library names (no User-Library relationship in MVP)
- **Many-to-Many**: Junction tables for Book-Genre, Book-Shelf, Book-LiteraryAward relationships

---

## Database Entities (Sequelize)

### 1. Book Model

**Description**: Core entity representing a single book in a user's library with all scraped metadata.

**Table Name**: `books`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Library } from './library.model';
import { Genre } from './genre.model';
import { BookGenre } from './book-genre.model';
import { Shelf } from './shelf.model';
import { BookShelf } from './book-shelf.model';
import { LiteraryAward } from './literary-award.model';
import { BookLiteraryAward } from './book-literary-award.model';

@Table({
  tableName: 'books',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['library_id', 'source_file'],
      name: 'books_library_source_unique',
    },
  ],
})
export class Book extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Foreign key relationship
  @ForeignKey(() => Library)
  @Column({ type: DataType.UUID, allowNull: false })
  libraryId: string;

  @BelongsTo(() => Library, { onDelete: 'CASCADE' })
  library: Library;

  // Required fields
  @Column({ type: DataType.STRING(500), allowNull: false })
  title: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  author: string;

  @Default('to-read')
  @Column({
    type: DataType.ENUM('read', 'currently-reading', 'to-read'),
    allowNull: false,
  })
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @Column({ type: DataType.INTEGER, allowNull: true })
  rating: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  isbn: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  publicationYear: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  pages: number | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  publisher: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  publicationDate: Date | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  setting: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  coverImageUrl: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  goodreadsUrl: string | null;

  // Categories & Organization (normalized many-to-many)
  @BelongsToMany(() => Genre, () => BookGenre)
  genres: Genre[];

  @BelongsToMany(() => Shelf, () => BookShelf)
  shelves: Shelf[];

  @BelongsToMany(() => LiteraryAward, () => BookLiteraryAward)
  literaryAwards: LiteraryAward[];

  // Dates
  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateAdded: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateStarted: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  dateFinished: Date | null;

  // User content
  @Column({ type: DataType.TEXT, allowNull: true })
  review: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  reviewDate: Date | null;

  // Source tracking (for debugging and deduplication)
  @Column({ type: DataType.STRING(255), allowNull: true })
  sourceFile: string | null;

  // Timestamps
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
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
- `UNIQUE(library_id, source_file)` - Prevents duplicate imports from same source

**Indexes** (for filtering and analytics):
```sql
CREATE INDEX idx_books_library_id ON books(library_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_rating ON books(rating);
CREATE INDEX idx_books_date_finished ON books(date_finished);
```

---

### 2. Library Model

**Description**: Container entity representing a user's library. In the current MVP, library names are globally unique.

**Table Name**: `libraries`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Book } from './book.model';

@Table({ tableName: 'libraries', underscored: true })
export class Library extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Library metadata - name is unique identifier (folder name)
  @Column({ type: DataType.STRING(200), allowNull: false, unique: true })
  name: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  folderPath: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  lastUploadedAt: Date | null;

  // Relationship to books
  @HasMany(() => Book)
  books: Book[];

  // Timestamps
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
```

**Database Constraints**:
- `name NOT NULL UNIQUE` - Library name is globally unique (based on folder name)

**MVP Note**: The current implementation does not have a User-Library relationship. Each library is identified by its unique name. Future enhancement could add user accounts and multi-library support.

**Indexes**:
```sql
CREATE INDEX idx_libraries_name ON libraries(name);
```

---

### 3. Genre Model

**Description**: Normalized table for book genres with deduplication.

**Table Name**: `genres`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { BookGenre } from './book-genre.model';

@Table({ tableName: 'genres', underscored: true })
export class Genre extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  name: string;

  // Normalized lowercase version for searching/matching
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // Many-to-many relationship with books
  @BelongsToMany(() => Book, () => BookGenre)
  books: Book[];
}
```

**Database Constraints**:
- `name NOT NULL UNIQUE`
- `slug NOT NULL UNIQUE`

---

### 4. Shelf Model

**Description**: Normalized table for user-defined and built-in shelves.

**Table Name**: `shelves`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { BookShelf } from './book-shelf.model';

@Table({ tableName: 'shelves', underscored: true })
export class Shelf extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  name: string;

  // Normalized lowercase version for searching/matching
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // Many-to-many relationship with books
  @BelongsToMany(() => Book, () => BookShelf)
  books: Book[];
}
```

**Database Constraints**:
- `name NOT NULL UNIQUE`
- `slug NOT NULL UNIQUE`

---

### 5. LiteraryAward Model

**Description**: Normalized table for literary awards (e.g., "Hugo Award", "Nebula Award").

**Table Name**: `literary_awards`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Book } from './book.model';
import { BookLiteraryAward } from './book-literary-award.model';

@Table({
  tableName: 'literary_awards',
  underscored: true,
})
export class LiteraryAward extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @BelongsToMany(() => Book, () => BookLiteraryAward)
  books: Book[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
```

**Database Constraints**:
- `name NOT NULL UNIQUE`
- `slug NOT NULL UNIQUE`

---

### 6. User Model (Future Use)

**Description**: User entity for session management and library ownership (not currently used in MVP).

**Table Name**: `users`

**Sequelize Model**:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Library } from './library.model';

@Table({ tableName: 'users', underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // Session identifier (MVP: no authentication, just session tracking)
  @Column({ type: DataType.STRING(255), unique: true, allowNull: false })
  sessionId: string;

  // User metadata (for future authentication feature)
  @Column({ type: DataType.STRING(100), allowNull: true })
  username: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  email: string | null;

  // Relationship to libraries
  @HasMany(() => Library)
  libraries: Library[];

  // Timestamps (automatically managed by Sequelize)
  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
```

**Database Constraints**:
- `session_id NOT NULL UNIQUE`

**MVP Note**: The User model is defined but not currently used. Libraries are identified by unique name without user ownership.

---

### 7. Junction Tables (Many-to-Many Relationships)

**BookGenre**: Links books to genres
**BookShelf**: Links books to shelves
**BookLiteraryAward**: Links books to literary awards

```typescript
// BookGenre junction table
@Table({ tableName: 'book_genres', underscored: true })
export class BookGenre extends Model {
  @ForeignKey(() => Book)
  @Column(DataType.UUID)
  bookId: string;

  @ForeignKey(() => Genre)
  @Column(DataType.UUID)
  genreId: string;
}

// BookShelf junction table
@Table({ tableName: 'book_shelves', underscored: true })
export class BookShelf extends Model {
  @ForeignKey(() => Book)
  @Column(DataType.UUID)
  bookId: string;

  @ForeignKey(() => Shelf)
  @Column(DataType.UUID)
  shelfId: string;
}

// BookLiteraryAward junction table
@Table({ tableName: 'book_literary_awards', underscored: true })
export class BookLiteraryAward extends Model {
  @ForeignKey(() => Book)
  @Column(DataType.UUID)
  bookId: string;

  @ForeignKey(() => LiteraryAward)
  @Column(DataType.UUID)
  literaryAwardId: string;
}
```

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
│    libraries     │
├──────────────────┤
│ id (PK)          │
│ name (UQ)        │◄────┐
│ folder_path      │     │
│ last_uploaded_at │     │ 1:N
│ created_at       │     │
└──────────────────┘     │
                         │
                         │
┌────────────────────────┼───────────────────────────────┐
│         books          │                               │
├────────────────────────┤                               │
│ id (PK)                │                               │
│ library_id (FK) ───────┘                               │
│ title                                                  │
│ author                                                 │
│ status                                                 │
│ rating                                                 │
│ isbn                                                   │
│ publication_year                                       │
│ publication_date                                       │
│ pages                                                  │
│ publisher                                              │
│ setting                                                │
│ cover_image_url                                        │
│ goodreads_url                                          │
│ date_added, date_started, date_finished               │
│ review, review_date                                    │
│ source_file                                            │
└────┬──────────┬──────────┬─────────────────────────────┘
     │          │          │
     │ N:M      │ N:M      │ N:M
     │          │          │
     ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌──────────────────┐
│ genres  │ │ shelves │ │ literary_awards  │
├─────────┤ ├─────────┤ ├──────────────────┤
│ id (PK) │ │ id (PK) │ │ id (PK)          │
│ name    │ │ name    │ │ name             │
│ slug    │ │ slug    │ │ slug             │
└─────────┘ └─────────┘ └──────────────────┘
     ▲          ▲          ▲
     │          │          │
     └──────────┴──────────┴─── Junction Tables:
                               - book_genres
                               - book_shelves
                               - book_literary_awards
```

**Relationship Details**:
- `libraries 1 → N books`: One library contains many books (CASCADE DELETE)
- `books N → M genres`: Many-to-many via `book_genres` junction table
- `books N → M shelves`: Many-to-many via `book_shelves` junction table
- `books N → M literary_awards`: Many-to-many via `book_literary_awards` junction table

**Normalization Benefits**:
- Genres, shelves, and awards are deduplicated (stored once, referenced many times)
- Enables efficient filtering and analytics (e.g., "all books in genre X")
- Slug fields enable case-insensitive search and matching

**MVP Simplification**:
- No User model integration (library name is globally unique)
- Future enhancement: Add User-Library relationship for multi-user support

---

## Database Migration Strategy

### Sequelize Sync Workflow

**Current Implementation**: Using Sequelize's `sync()` method for automatic schema creation.

**Database Initialization**:
```typescript
// In app.module.ts or database config
sequelize.sync({
  alter: true,  // Development: Alter tables to match models
  // force: true  // DANGER: Drops and recreates all tables
});
```

**Production Approach** (recommended for future):
Use Sequelize migrations for controlled schema changes:

**1. Generate Migration**:
```bash
npx sequelize-cli migration:generate --name add-literary-awards-table
```

**2. Migration File Example**:
```javascript
// migrations/20251110-add-literary-awards.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create literary_awards table
    await queryInterface.createTable('literary_awards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create junction table
    await queryInterface.createTable('book_literary_awards', {
      book_id: {
        type: Sequelize.UUID,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      literary_award_id: {
        type: Sequelize.UUID,
        references: { model: 'literary_awards', key: 'id' },
        onDelete: 'CASCADE',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('book_literary_awards');
    await queryInterface.dropTable('literary_awards');
  },
};
```

**3. Run Migrations**:
```bash
npx sequelize-cli db:migrate
```

**4. Rollback**:
```bash
npx sequelize-cli db:migrate:undo
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

**1. Efficient Filtering** (using Sequelize):
```typescript
async findFilteredBooks(libraryId: string, filters: FilterRequestDto): Promise<Book[]> {
  const where: any = { libraryId };
  const include: any[] = [];

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.ratingMin || filters.ratingMax) {
    where.rating = {};
    if (filters.ratingMin) where.rating[Op.gte] = filters.ratingMin;
    if (filters.ratingMax) where.rating[Op.lte] = filters.ratingMax;
  }

  if (filters.dateStart || filters.dateEnd) {
    where.dateFinished = {};
    if (filters.dateStart) where.dateFinished[Op.gte] = filters.dateStart;
    if (filters.dateEnd) where.dateFinished[Op.lte] = filters.dateEnd;
  }

  if (filters.genres && filters.genres.length > 0) {
    include.push({
      model: Genre,
      where: { slug: { [Op.in]: filters.genres.map(g => g.toLowerCase()) } },
      required: true,
    });
  }

  if (filters.shelves && filters.shelves.length > 0) {
    include.push({
      model: Shelf,
      where: { slug: { [Op.in]: filters.shelves.map(s => s.toLowerCase()) } },
      required: true,
    });
  }

  return this.bookModel.findAll({ where, include });
}
```

**2. Aggregation in Database** (not application):
```typescript
async getGenreBreakdown(libraryId: string): Promise<CategoryBreakdown[]> {
  // Use Sequelize with joins for efficient aggregation
  return this.bookModel.sequelize.query(`
    SELECT
      g.name,
      g.slug,
      COUNT(DISTINCT b.id) AS count,
      ROUND(COUNT(DISTINCT b.id) * 100.0 / (
        SELECT COUNT(*) FROM books WHERE library_id = :libraryId
      ), 2) AS percentage,
      ROUND(AVG(b.rating), 2) AS "averageRating"
    FROM genres g
    INNER JOIN book_genres bg ON g.id = bg.genre_id
    INNER JOIN books b ON bg.book_id = b.id
    WHERE b.library_id = :libraryId AND b.rating IS NOT NULL
    GROUP BY g.id, g.name, g.slug
    ORDER BY count DESC
    LIMIT 20
  `, {
    replacements: { libraryId },
    type: QueryTypes.SELECT,
  });
}
```

**3. Connection Pooling**:
```typescript
// Sequelize connection options
new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  database: 'analytics',
  pool: {
    max: 10,        // Maximum connections
    min: 2,         // Minimum connections
    acquire: 30000, // Max time to get connection
    idle: 10000,    // Max time connection can be idle
  },
});
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
| Library | `libraries` | Container for books | `name` (unique) |
| Book | `books` | Core library data | `library_id`, `status`, `rating`, `date_finished`, `(library_id, source_file)` unique |
| Genre | `genres` | Book genres (normalized) | `name` (unique), `slug` (unique) |
| Shelf | `shelves` | User shelves (normalized) | `name` (unique), `slug` (unique) |
| LiteraryAward | `literary_awards` | Literary awards (normalized) | `name` (unique), `slug` (unique) |
| BookGenre | `book_genres` | Book-Genre junction | `book_id`, `genre_id` |
| BookShelf | `book_shelves` | Book-Shelf junction | `book_id`, `shelf_id` |
| BookLiteraryAward | `book_literary_awards` | Book-Award junction | `book_id`, `literary_award_id` |

**Architecture Highlights**:
- **ORM**: Sequelize (not TypeORM)
- **Normalization**: Genres, shelves, and awards in separate tables with many-to-many relationships
- **Deduplication**: Slug fields for case-insensitive matching
- **MVP**: No User-Library relationship (library name globally unique)

**API Contracts**:
- **Requests**: CreateBookDto, FilterRequestDto (validated with class-validator)
- **Responses**: AnalyticsSummaryDto, UploadResponseDto

**Storage Estimates** (2000 books with 100 unique genres, 50 shelves, 20 awards):
- Books table: ~2MB
- Genres/Shelves/Awards tables: ~50KB
- Junction tables: ~300KB
- Indexes: ~500KB
- Total: ~2.85MB per library

**Performance Targets**:
- ✅ FR-029: Analytics API <500ms (achieved with normalized structure + joins)
- ✅ SC-001: Upload 2000 books in <3s (bulk insert with transactions, findOrCreate for lookups)

**Implementation Status**:
- ✅ All models implemented in `dashboard-backend/src/models/`
- ✅ Sequelize sync creating tables automatically
- ✅ Library import service handling normalization and deduplication
- ✅ Analytics engine using joins for efficient aggregation

All schemas comply with:
- **Principle I**: Data-First Development (PostgreSQL database, Sequelize models)
- **Principle IV**: Integration & Contract Testing (class-validator DTOs, API contracts)
- **Principle VI**: Data Quality & Validation (DTO validation, database constraints, unique constraints)
