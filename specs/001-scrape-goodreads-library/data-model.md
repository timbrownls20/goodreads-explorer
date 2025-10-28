# Data Model: Scrape Goodreads Library

**Feature**: 001-scrape-goodreads-library
**Date**: 2025-10-28
**Version**: 1.0.0

## Overview

This document defines the data models for scraping and storing Goodreads library information. All models use Pydantic v2 for validation, type safety, and JSON serialization per [research.md](./research.md) technical decisions.

## Entity Diagram

```
Library (1) ─────┐
                 │
                 ├──> (n) UserBookRelation ──> (1) Book
                 │           │
                 │           └──> (n) Shelf
                 │           └──> (0..1) Review
                 │
                 └──> (n) Shelf (custom + built-in)
```

## Core Entities

### Book

Represents a single book with metadata extracted from Goodreads.

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `goodreads_id` | `str` | Yes | Non-empty | Unique Goodreads book identifier |
| `title` | `str` | Yes | Non-empty, max 500 chars | Book title |
| `author` | `str` | Yes | Non-empty, max 200 chars | Primary author name |
| `additional_authors` | `list[str]` | No | Default: `[]` | Co-authors, editors, etc. |
| `isbn` | `ISBN \| None` | No | Valid ISBN-10 or ISBN-13 | International Standard Book Number |
| `isbn13` | `str \| None` | No | 13-digit format | ISBN-13 specifically (if different from ISBN) |
| `publication_year` | `int \| None` | No | 1000-2100 | Year of publication |
| `publisher` | `str \| None` | No | Max 200 chars | Publisher name |
| `page_count` | `int \| None` | No | ≥ 1 | Number of pages |
| `language` | `str \| None` | No | ISO 639-1 code preferred | Book language |
| `genres` | `list[str]` | No | Default: `[]`, max 50 genres | Genre tags/categories |
| `average_rating` | `float \| None` | No | 0.0-5.0 | Goodreads community average rating |
| `ratings_count` | `int \| None` | No | ≥ 0 | Number of ratings on Goodreads |
| `cover_image_url` | `HttpUrl \| None` | No | Valid HTTP(S) URL | URL to cover image |
| `goodreads_url` | `HttpUrl` | Yes | Valid Goodreads book URL | Canonical Goodreads book page |

**Validation Rules**:
- `title`: Must be non-empty after stripping whitespace
- `author`: Must be non-empty after stripping whitespace
- `isbn`: Validated using `pydantic-extra-types.isbn.ISBN` (auto-validates ISBN-10/13 format and checksum)
- `publication_year`: Must be reasonable (1000-2100 range)
- `page_count`: Must be positive integer if present
- `average_rating`: Must be 0.0-5.0 if present
- `genres`: Each genre max 50 chars, deduplicated, lowercased

**Example**:
```python
from pydantic import BaseModel, Field, HttpUrl
from pydantic_extra_types.isbn import ISBN

class Book(BaseModel):
    goodreads_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=500)
    author: str = Field(min_length=1, max_length=200)
    additional_authors: list[str] = Field(default_factory=list)
    isbn: ISBN | None = None
    isbn13: str | None = Field(None, pattern=r'^\d{13}$')
    publication_year: int | None = Field(None, ge=1000, le=2100)
    publisher: str | None = Field(None, max_length=200)
    page_count: int | None = Field(None, ge=1)
    language: str | None = None
    genres: list[str] = Field(default_factory=list, max_length=50)
    average_rating: float | None = Field(None, ge=0.0, le=5.0)
    ratings_count: int | None = Field(None, ge=0)
    cover_image_url: HttpUrl | None = None
    goodreads_url: HttpUrl
```

---

### Shelf

Represents a categorization container for books (built-in or custom user-defined).

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | `str` | Yes | Non-empty, max 100 chars | Shelf name |
| `is_builtin` | `bool` | Yes | Default: `False` | Whether this is a Goodreads built-in shelf |
| `book_count` | `int` | No | ≥ 0 | Number of books on this shelf (if available) |

**Built-in Shelves**:
- `read`: Books the user has finished reading
- `currently-reading`: Books the user is currently reading
- `to-read`: Books the user wants to read

**Validation Rules**:
- `name`: Trimmed, lowercased for consistency
- Built-in shelves: Exactly one of `read`, `currently-reading`, or `to-read` with `is_builtin=True`
- Custom shelves: Any user-defined name with `is_builtin=False`

**Example**:
```python
class Shelf(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_builtin: bool = False
    book_count: int | None = Field(None, ge=0)

    @field_validator('name')
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip().lower()
```

---

### Review

Represents a user's review of a book.

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `review_text` | `str` | Yes | Max 50,000 chars | Full review text |
| `review_date` | `datetime` | No | Valid datetime | When review was posted |
| `likes_count` | `int` | No | ≥ 0 | Number of likes on review |

**Validation Rules**:
- `review_text`: Can be empty string for "rating-only" reviews, but field must exist
- `review_date`: ISO 8601 format, auto-parsed by Pydantic
- HTML tags stripped from `review_text` during parsing

**Example**:
```python
from datetime import datetime

class Review(BaseModel):
    review_text: str = Field(max_length=50000)
    review_date: datetime | None = None
    likes_count: int | None = Field(None, ge=0)
```

---

### UserBookRelation

Represents the relationship between a user and a book, capturing user-specific data.

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `book` | `Book` | Yes | Valid Book object | The book being referenced |
| `user_rating` | `int \| None` | No | 1-5 | User's rating (1-5 stars) |
| `reading_status` | `ReadingStatus` | Yes | Enum value | Current reading status |
| `shelves` | `list[Shelf]` | Yes | Non-empty, deduplicated | Shelves this book is on |
| `review` | `Review \| None` | No | Valid Review object | User's review (if exists) |
| `date_added` | `datetime \| None` | No | Valid datetime | When book was added to library |
| `date_started` | `datetime \| None` | No | Valid datetime | When user started reading |
| `date_finished` | `datetime \| None` | No | Valid datetime | When user finished reading |

**ReadingStatus Enum**:
```python
from enum import Enum

class ReadingStatus(str, Enum):
    READ = "read"
    CURRENTLY_READING = "currently-reading"
    TO_READ = "to-read"
```

**Validation Rules**:
- `user_rating`: Must be 1-5 if present (Goodreads uses 1-5 stars)
- `shelves`: Must contain at least one shelf, deduplicated by name
- `date_started`: Must be ≤ `date_finished` if both present
- `date_added`: Should be ≤ `date_started` if both present (soft validation, warn if violated)

**Example**:
```python
class UserBookRelation(BaseModel):
    book: Book
    user_rating: int | None = Field(None, ge=1, le=5)
    reading_status: ReadingStatus
    shelves: list[Shelf] = Field(min_length=1)
    review: Review | None = None
    date_added: datetime | None = None
    date_started: datetime | None = None
    date_finished: datetime | None = None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.date_started and self.date_finished:
            if self.date_started > self.date_finished:
                raise ValueError("date_started cannot be after date_finished")
        return self
```

---

### Library

Represents the complete collection of books for a Goodreads user.

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `user_id` | `str` | Yes | Non-empty | Goodreads user ID |
| `username` | `str` | Yes | Non-empty, max 100 chars | Goodreads username |
| `profile_url` | `HttpUrl` | Yes | Valid Goodreads profile URL | User's profile URL |
| `user_books` | `list[UserBookRelation]` | Yes | Default: `[]` | All books in user's library |
| `total_books` | `int` | Yes | ≥ 0 | Total count of books |
| `scraped_at` | `datetime` | Yes | Valid datetime, auto-generated | Timestamp of data extraction |
| `schema_version` | `str` | Yes | Semantic version format | Data schema version (e.g., "1.0.0") |

**Validation Rules**:
- `total_books`: Should equal `len(user_books)` after full scrape
- `schema_version`: Must follow semantic versioning (MAJOR.MINOR.PATCH)
- `scraped_at`: Auto-generated with timezone info (UTC)

**Example**:
```python
from datetime import datetime, timezone

class Library(BaseModel):
    user_id: str = Field(min_length=1)
    username: str = Field(min_length=1, max_length=100)
    profile_url: HttpUrl
    user_books: list[UserBookRelation] = Field(default_factory=list)
    total_books: int = Field(ge=0)
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    schema_version: str = Field(default="1.0.0", pattern=r'^\d+\.\d+\.\d+$')

    @model_validator(mode='after')
    def validate_totals(self):
        if self.total_books != len(self.user_books):
            # Warn but don't fail - might be partial scrape
            pass  # Log warning
        return self
```

---

## Export Formats

### JSON Export Schema

Complete hierarchical structure preserving all relationships.

**File naming**: `{username}_library_{YYYY-MM-DD}.json`

**Structure**:
```json
{
  "user_id": "12345",
  "username": "bookworm",
  "profile_url": "https://www.goodreads.com/user/show/12345-bookworm",
  "total_books": 250,
  "scraped_at": "2025-10-28T10:30:00Z",
  "schema_version": "1.0.0",
  "user_books": [
    {
      "book": {
        "goodreads_id": "123",
        "title": "Example Book",
        "author": "Jane Doe",
        "isbn": "978-0-123456-78-9",
        "publication_year": 2020,
        "genres": ["fiction", "mystery"],
        ...
      },
      "user_rating": 5,
      "reading_status": "read",
      "shelves": [
        {"name": "read", "is_builtin": true},
        {"name": "favorites", "is_builtin": false}
      ],
      "review": {
        "review_text": "Amazing book!",
        "review_date": "2025-01-15T14:30:00Z"
      },
      "date_finished": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### CSV Export Schema

Flattened structure with one row per book-shelf combination.

**File naming**: `{username}_library_{YYYY-MM-DD}.csv`

**Columns**:
```
user_id, username, goodreads_book_id, title, author, isbn, publication_year, page_count,
genres, user_rating, reading_status, shelf_name, is_builtin_shelf, review_text,
date_added, date_started, date_finished, scraped_at
```

**Handling Multi-valued Fields**:
- **Shelves**: One row per shelf (book appears N times for N shelves)
- **Genres**: Pipe-separated string (`"fiction|mystery|thriller"`)
- **Additional Authors**: Pipe-separated string
- **Review**: Truncated to 1000 chars, escaped for CSV

**Example Row**:
```csv
12345,bookworm,123,"Example Book","Jane Doe",978-0-123456-78-9,2020,350,"fiction|mystery",5,read,read,true,"Amazing book!",2024-12-01,2025-01-01,2025-01-15,2025-10-28T10:30:00Z
12345,bookworm,123,"Example Book","Jane Doe",978-0-123456-78-9,2020,350,"fiction|mystery",5,read,favorites,false,"Amazing book!",2024-12-01,2025-01-01,2025-01-15,2025-10-28T10:30:00Z
```

---

## Data Quality & Validation

Per Constitution Principle VI, all data ingress points implement validation:

### URL Validation
- Goodreads profile URLs: `https://www.goodreads.com/user/show/{user_id}[-{username}]`
- Book URLs: `https://www.goodreads.com/book/show/{book_id}[-{title-slug}]`

### Field Validation
- **Ratings**: 1-5 integer range
- **ISBN**: Valid ISBN-10 or ISBN-13 with checksum validation (via `pydantic-extra-types`)
- **Dates**: ISO 8601 format, auto-parsed by Pydantic datetime
- **Page counts**: Positive integers
- **Publication years**: 1000-2100 range (catches OCR/parsing errors)

### Missing Data Handling
- Optional fields marked with `| None` type annotation
- Empty lists (`[]`) for collections with no data
- Null values serialized as `null` in JSON, empty strings in CSV

### Error Reporting
Validation failures produce detailed error messages:
```python
{
  "type": "int_parsing",
  "loc": ["user_books", 0, "user_rating"],
  "msg": "Input should be a valid integer",
  "input": "five stars"
}
```

---

## State Transitions

### Reading Status Transitions

```
[No Book] → TO_READ → CURRENTLY_READING → READ
              ↓              ↓               ↓
              └──────────────┴───────────────┘
                   (back to TO_READ)
```

Valid transitions:
- `TO_READ` → `CURRENTLY_READING` (start reading)
- `CURRENTLY_READING` → `READ` (finish reading)
- `READ` → `TO_READ` (re-read)
- Any status → `TO_READ` (reset)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Initial data model definition |

Future versions will increment per Constitution governance:
- **MAJOR**: Breaking schema changes (field removal, type changes)
- **MINOR**: New optional fields added
- **PATCH**: Validation rule refinements, bug fixes
