# TypeScript Goodreads Parser

A TypeScript port of the Python Goodreads library scraper, maintaining all functionality from the original implementation.

## Features

- ✅ Scrape Goodreads user libraries
- ✅ Export to JSON or CSV formats
- ✅ Individual book file exports
- ✅ Rate limiting and retry logic
- ✅ Progress tracking
- ✅ Full data validation with class-validator
- ✅ TypeScript type safety
- ✅ Comprehensive test coverage

## Architecture

### Models (`models/`)
- **Book**: Individual book metadata with validation
- **Library**: Root aggregate for user's library
- **UserBookRelation**: User's relationship with a book (rating, shelves, reviews, read records)
- **Shelf**: Book shelves and reading statuses
- **ReadRecord**: Individual read instances with start/finish dates

### Scrapers (`scrapers/`)
- **GoodreadsScraper**: Main scraper class with rate limiting, retry logic, and pagination
- **PaginationHelper**: Utilities for handling multi-page scraping

### Parsers (`parsers/`)
- **LibraryParser**: Parse library pages with BeautifulSoup-like API (Cheerio)
- **BookParser**: Parse individual book detail pages

### Validators (`validators/`)
- **UrlValidator**: Validate and normalize Goodreads URLs
- **DataValidator**: Field-level validation (ISBN, ratings, dates, etc.)

### Exporters (`exporters/`)
- **JsonExporter**: Export to JSON format (single file or per-book)
- **CsvExporter**: Export to CSV format

## Usage

### As a Library

```typescript
import { scrapeAndExport } from './parser/api';

// Scrape and export to JSON
const library = await scrapeAndExport(
  'https://www.goodreads.com/user/show/12345-username',
  {
    outputFormat: 'json',
    outputPath: 'library.json',
    rateLimitDelay: 1000,
    maxRetries: 3,
  }
);

console.log(`Scraped ${library.totalBooks} books`);
```

### CLI

```bash
# Scrape all books to JSON
pnpm run scrape scrape https://www.goodreads.com/user/show/12345-username

# Scrape to CSV
pnpm run scrape scrape https://www.goodreads.com/user/show/12345 -f csv -o my-library.csv

# Scrape with individual book files
pnpm run scrape scrape https://www.goodreads.com/user/show/12345 --per-book-files -d ./output

# Scrape first 100 books with slower rate limit
pnpm run scrape scrape https://www.goodreads.com/user/show/12345 --limit 100 --rate-limit 2000

# Show help
pnpm run scrape help
```

## CLI Options

- `-f, --format <format>`: Output format (json or csv) - default: json
- `-o, --output <path>`: Output file path - default: library.[format]
- `-d, --output-dir <dir>`: Directory for individual book files - default: ./output
- `--rate-limit <ms>`: Delay between requests in ms - default: 1000
- `--max-retries <count>`: Maximum retry attempts - default: 3
- `--timeout <ms>`: Request timeout in ms - default: 30000
- `--limit <count>`: Maximum number of books to scrape
- `--sort-by <field>`: Sort by (date-read, date-added, title, author, rating)
- `--per-book-files`: Save individual JSON file per book
- `--no-progress`: Disable progress reporting

## Dependencies

- **cheerio**: HTML parsing (equivalent to BeautifulSoup)
- **axios**: HTTP client (equivalent to httpx)
- **class-validator**: Data validation (equivalent to Pydantic)
- **class-transformer**: Object transformation
- **commander**: CLI framework (equivalent to Click)

## Differences from Python Version

### Equivalent Technologies
- BeautifulSoup4 → Cheerio
- httpx → Axios
- Pydantic → class-validator + class-transformer
- Click → Commander
- structlog → Winston (already in project)

### Implementation Differences
1. **Async/Await**: TypeScript version uses native async/await instead of Python's asyncio
2. **Decorators**: Uses TypeScript decorators for validation instead of Pydantic validators
3. **Type Safety**: Leverages TypeScript's compile-time type checking
4. **Error Handling**: Uses TypeScript error classes with proper inheritance

### Maintained Functionality
- ✅ All validation rules
- ✅ Rate limiting with exponential backoff
- ✅ Pagination handling
- ✅ Multi-shelf scraping
- ✅ Review and read record extraction
- ✅ Genre normalization
- ✅ Individual book file exports
- ✅ CSV export with one row per book-shelf combination
- ✅ Private profile detection
- ✅ URL normalization
- ✅ Progress callbacks

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:cov

# Run tests in watch mode
pnpm run test:watch
```

## Integration with NestJS Backend

The parser is integrated into the NestJS backend and can be used:

1. **As a standalone CLI** (via `pnpm run scrape`)
2. **As a library** (imported into services)
3. **Via existing import service** (library-import.service.ts can use this instead of Python)

## Example Output

### JSON Format
```json
{
  "user_id": "12345",
  "username": "johndoe",
  "profile_url": "https://www.goodreads.com/user/show/12345",
  "scraped_at": "2025-11-14T00:00:00.000Z",
  "schema_version": "1.0.0",
  "total_books": 150,
  "user_books": [
    {
      "book": {
        "goodreads_id": "190065.Monkey",
        "title": "Monkey: A Journey to the West",
        "author": "Wu Cheng'en",
        "genres": ["classics", "fiction", "fantasy"],
        "average_rating": 4.04,
        "ratings_count": 7982,
        "cover_image_url": "https://...",
        "goodreads_url": "https://www.goodreads.com/book/show/190065"
      },
      "user_rating": null,
      "reading_status": "read",
      "shelves": [
        { "name": "read", "is_builtin": true },
        { "name": "travel", "is_builtin": false }
      ],
      "review": null,
      "date_added": "2023-12-12T00:00:00",
      "read_records": [
        { "date_started": null, "date_finished": null }
      ]
    }
  ]
}
```

## Migration from Python Parser

To migrate from the Python parser to TypeScript:

1. **Replace scraper calls**:
   ```typescript
   // Before (Python CLI)
   // goodreads-explorer scrape <url>

   // After (TypeScript)
   import { scrapeLibrary } from './parser/api';
   const library = await scrapeLibrary(url);
   ```

2. **Update imports**:
   ```typescript
   import {
     Library,
     Book,
     UserBookRelation,
     GoodreadsScraper
   } from './parser';
   ```

3. **No changes needed** to:
   - JSON file format (100% compatible)
   - Database import logic
   - CLI usage (same command structure)

## License

ISC
