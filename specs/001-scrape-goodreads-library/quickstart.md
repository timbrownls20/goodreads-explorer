# Quickstart: Scrape Goodreads Library

**Feature**: 001-scrape-goodreads-library
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This quickstart guide demonstrates how to use the Goodreads library scraper to extract and export book data from Goodreads user profiles.

## Installation

### Prerequisites

- Node.js 18+ LTS (Node.js 20+ recommended)
- pnpm package manager (or npm)
- Internet connection for scraping Goodreads

### Install Dependencies

```bash
# Navigate to the parser directory
cd goodreads-explorer/parser

# Install dependencies using pnpm (recommended)
pnpm install

# OR using npm
npm install
```

### Build the Project

```bash
# Compile TypeScript to JavaScript
pnpm build

# OR using npm
npm run build
```

This will install:
- Core dependencies (cheerio, axios, class-validator, winston, etc.)
- TypeScript compiler and type definitions
- Development tools (jest, eslint, prettier)

## Basic Usage

### CLI Interface

#### 1. Scrape a Goodreads Library

```bash
# Using pnpm (from parser directory)
pnpm run scrape:dev

# Or run the CLI directly with ts-node
npx ts-node src/cli/scrape-library.ts scrape https://www.goodreads.com/user/show/172435467-tim-brown

# Or after building, use the compiled version
node dist/cli/scrape-library.js scrape https://www.goodreads.com/user/show/172435467-tim-brown
```

**Output**:
```
Successfully scraped 250 books from tim-brown
Files saved to: ./output/tim-brown_library/
```

Each book is saved as an individual JSON file named `{goodreads-id}.json`.

#### 2. Specify Output Directory

```bash
# Save files to custom directory
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --output-dir ./exports
```

#### 3. Advanced Options

```bash
# Scrape only the first 50 books (useful for testing)
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --limit 50

# Scrape only a specific shelf
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --shelf read

# Filter by title
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --title "Harry Potter"

# Use rate limiting (slower scraping, delay in ms)
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --rate-limit 2000

# Resume interrupted scrape (skip already downloaded books)
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --resume

# Increase timeout and retries for slow connections
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --timeout 60000 --max-retries 5
```

### Library/Programmatic Interface

#### Basic Scraping

```typescript
import { scrapeLibrary } from './api';
import { JSONExporter } from './exporters/json-exporter';

// Scrape library
const library = await scrapeLibrary("https://www.goodreads.com/user/show/172435467-tim-brown");

// Export to JSON (if exporter is implemented)
const exporter = new JSONExporter();
exporter.export(library, "./tim-brown_library.json");

// Access data
console.log(`Total books: ${library.totalBooks}`);
console.log(`Username: ${library.username}`);

// Iterate through books
for (const userBook of library.userBooks) {
    console.log(`${userBook.book.title} by ${userBook.book.author}`);
    console.log(`  Rating: ${userBook.userRating}/5`);
    console.log(`  Status: ${userBook.readingStatus}`);
    console.log(`  Shelves: ${userBook.shelves.join(', ')}`);
}
```

#### Advanced: Custom Filtering

```typescript
import { scrapeLibrary } from './api';

const library = await scrapeLibrary("https://www.goodreads.com/user/show/172435467-tim-brown");

// Filter books by rating
const fiveStarBooks = library.userBooks.filter(ub => ub.userRating === 5);

// Filter by reading status
const currentlyReading = library.userBooks.filter(
    ub => ub.readingStatus === 'currently-reading'
);

// Filter by shelf
const favorites = library.userBooks.filter(
    ub => ub.shelves.includes('favorites')
);

// Filter by genre
const mysteryBooks = library.userBooks.filter(
    ub => ub.book.genres?.includes('mystery')
);

console.log(`5-star books: ${fiveStarBooks.length}`);
console.log(`Currently reading: ${currentlyReading.length}`);
console.log(`Favorites: ${favorites.length}`);
console.log(`Mystery books: ${mysteryBooks.length}`);
```

#### Error Handling

```typescript
import { scrapeLibrary } from './api';
import {
    InvalidURLError,
    PrivateProfileError,
    NetworkError,
    ScrapingError
} from './exceptions/parser-exceptions';

try {
    const library = await scrapeLibrary("https://www.goodreads.com/user/show/172435467-tim-brown");
} catch (error) {
    if (error instanceof InvalidURLError) {
        console.error(`Invalid Goodreads URL: ${error.message}`);
    } else if (error instanceof PrivateProfileError) {
        console.error("Profile is private and cannot be scraped");
    } else if (error instanceof NetworkError) {
        console.error(`Network error: ${error.message}. Check your internet connection.`);
    } else if (error instanceof ScrapingError) {
        console.error(`Scraping error: ${error.message}`);
    }
}
```

#### Progress Callbacks

```typescript
import { scrapeLibrary } from './api';

const library = await scrapeLibrary(
    "https://www.goodreads.com/user/show/172435467-tim-brown",
    {
        progressCallback: (scraped: number, totalProcessed: number) => {
            console.log(`Progress: ${scraped} books scraped, ${totalProcessed} total processed`);
        }
    }
);
```

## Export Formats

### JSON Export

**File naming**: Individual files per book in `{username}_library/` directory named `{goodreads-id}.json`

**Structure**:
```json
{
  "book": {
    "goodreadsId": "123",
    "title": "Example Book",
    "author": "Jane Doe",
    "isbn": "978-0-123456-78-9",
    "publicationDate": "2020-01-01",
    "pageCount": 350,
    "genres": ["fiction", "mystery"],
    "goodreadsUrl": "https://www.goodreads.com/book/show/123"
  },
  "userRating": 5,
  "readingStatus": "read",
  "shelves": ["read", "favorites"],
  "review": {
    "reviewText": "Amazing book!",
    "reviewDate": "2025-01-15"
  },
  "readRecords": [
    {
      "dateStarted": "2025-01-01",
      "dateFinished": "2025-01-15"
    }
  ],
  "dateAdded": "2024-12-01"
}
```

**Use Cases**:
- Programmatic data analysis
- Backup of Goodreads library
- Migration to other book tracking systems
- Feeding data to recommendation algorithms

### CSV Export

**File naming**: `{username}_library_{YYYY-MM-DD}.csv`

**Structure**: Flattened rows with one row per book-shelf combination

**Use Cases**:
- Spreadsheet analysis (Excel, Google Sheets)
- Data visualization tools
- Simple filtering and sorting
- Non-technical users

See [contracts/csv-export-spec.md](./contracts/csv-export-spec.md) for detailed CSV format specification.

## Common Use Cases

### 1. Backup Goodreads Library

```bash
# Create JSON backup
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --output-dir ./backups
```

### 2. Analyze Reading Patterns

```typescript
import { scrapeLibrary } from './api';

const library = await scrapeLibrary("https://www.goodreads.com/user/show/172435467-tim-brown");

// Books read per year
const booksByYear: { [year: string]: number } = {};
library.userBooks.forEach(ub => {
    if (ub.readRecords && ub.readRecords.length > 0) {
        const dateFinished = ub.readRecords[0].dateFinished;
        if (dateFinished) {
            const year = new Date(dateFinished).getFullYear().toString();
            booksByYear[year] = (booksByYear[year] || 0) + 1;
        }
    }
});

// Average rating
const ratings = library.userBooks
    .map(ub => ub.userRating)
    .filter(r => r != null) as number[];
const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

// Most read genres
const genreCounter: { [genre: string]: number } = {};
library.userBooks.forEach(ub => {
    ub.book.genres?.forEach(genre => {
        genreCounter[genre] = (genreCounter[genre] || 0) + 1;
    });
});

const topGenres = Object.entries(genreCounter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

console.log(`Books read by year: ${JSON.stringify(booksByYear)}`);
console.log(`Average rating: ${avgRating.toFixed(2)}`);
console.log(`Top 5 genres: ${JSON.stringify(topGenres)}`);
```

### 3. Scrape Specific Shelf

```bash
# Scrape only "read" shelf
npx ts-node src/cli/scrape-library.ts scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --shelf read
```

### 4. Find Books to Re-read

```typescript
import { scrapeLibrary } from './api';

const library = await scrapeLibrary("https://www.goodreads.com/user/show/172435467-tim-brown");

// Find 5-star books read more than 2 years ago
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

const rereadCandidates = library.userBooks
    .filter(ub =>
        ub.userRating === 5 &&
        ub.readRecords &&
        ub.readRecords.length > 0 &&
        ub.readRecords[0].dateFinished &&
        new Date(ub.readRecords[0].dateFinished) < twoYearsAgo
    )
    .sort((a, b) => {
        const dateA = a.readRecords?.[0]?.dateFinished || '';
        const dateB = b.readRecords?.[0]?.dateFinished || '';
        return dateA.localeCompare(dateB);
    });

console.log("Books to consider re-reading:");
rereadCandidates.slice(0, 10).forEach(ub => {
    const dateFinished = ub.readRecords?.[0]?.dateFinished || 'Unknown';
    console.log(`- ${ub.book.title} by ${ub.book.author}`);
    console.log(`  Read: ${dateFinished}`);
});
```

## Rate Limiting

The scraper respects Goodreads servers with conservative rate limiting (default: 1 request/second):

- **Large libraries**: 500 books = ~8-10 minutes, 1000 books = ~17-20 minutes
- **Progress indication**: Real-time progress bar shows current book and estimated completion
- **Adjustable rate**: Use `--rate-limit 2.0` to slow down to 1 request every 2 seconds
- **Best practice**: If scraping multiple profiles, add delays between runs

## Data Validation

All scraped data is validated against schemas (see [data-model.md](./data-model.md)):

- **ISBNs**: Checksum validated (ISBN-10/ISBN-13)
- **Ratings**: Must be 1-5 integer
- **Dates**: ISO 8601 format, auto-parsed
- **URLs**: Must be valid Goodreads URLs

Invalid data is logged with warnings but doesn't stop scraping.

## Logging

View detailed scraping logs:

```bash
# Disable progress bar for logging to file
goodreads-explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --no-progress > scrape.log 2>&1
```

Log output includes:
- URLs accessed
- Data volumes (books, reviews, shelves)
- Validation warnings
- Network errors and retries
- Rate limiting info

## Troubleshooting

### Issue: "Profile is private"

**Error**: `PrivateProfileError: Cannot scrape private Goodreads profile`

**Solution**: The profile must be public. Check Goodreads privacy settings or use your own profile URL with authentication (future feature).

### Issue: Scraping is slow

**Cause**: Rate limiting (1 request/second) is intentional to respect Goodreads servers.

**Solutions**:
- Use `--resume` flag to restart interrupted scrapes
- Scrape during off-peak hours
- For very large libraries (2000+ books), consider splitting into manual batches

### Issue: Network timeouts

**Error**: `NetworkError: Request timed out`

**Solutions**:
```bash
# Increase timeout and retries
goodreads-explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --timeout 60 --max-retries 5
```

### Issue: Missing book metadata

**Behavior**: Some books have `null` for ISBN, publication year, page count, etc.

**Explanation**: This is expected. Goodreads data quality varies. The scraper captures what's available and marks missing fields as `null`.

**Check**: Review validation warnings in logs to see which fields are missing.

## Testing

Run test suite to verify scraper functionality:

```bash
# Run all tests
pnpm test

# OR using npm
npm test

# Run with coverage report
pnpm run test:cov

# OR
npm run test:cov
```

## Next Steps

- **Data analysis**: Use Python pandas/matplotlib for visualization
- **Recommendation system**: Build book recommendations from genre/rating patterns
- **Reading goals**: Track progress toward yearly reading goals
- **Shelf management**: Bulk organize books into custom shelves
- **Export to other platforms**: Convert to LibraryThing, StoryGraph formats

## Support & Documentation

- **Full API docs**: See [data-model.md](./data-model.md)
- **Export contracts**: See [contracts/](./contracts/)
- **Technical design**: See [plan.md](./plan.md)
- **Research decisions**: See [research.md](./research.md)
- **Report issues**: GitHub Issues
- **Constitution compliance**: See [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Initial quickstart guide |
