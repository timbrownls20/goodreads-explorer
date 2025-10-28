# Quickstart: Scrape Goodreads Library

**Feature**: 001-scrape-goodreads-library
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This quickstart guide demonstrates how to use the Goodreads library scraper to extract and export book data from Goodreads user profiles.

## Installation

### Prerequisites

- Python 3.10 or higher (Python 3.12 recommended)
- pip package manager
- Internet connection for scraping Goodreads

### Install Dependencies

```bash
# Install core dependencies
pip3 install beautifulsoup4 lxml httpx pydantic pydantic-extra-types

# Install development dependencies (for testing)
pip3 install pytest pytest-asyncio pytest-cov pytest-mock
```

Or using a requirements file:

```bash
pip3 install -r requirements.txt
```

## Basic Usage

### CLI Interface

#### 1. Scrape a Goodreads Library

```bash
# Scrape library and export to JSON
python3 -m goodreads_explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown

# Scrape and specify output format
python3 -m goodreads_explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown --format json

# Scrape and export to CSV
python3 -m goodreads_explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown --format csv

# Scrape and export to both JSON and CSV
python3 -m goodreads_explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown --format all
```

**Output**:
```
Scraping library for user: tim-brown (ID: 172435467)
Progress: [████████████████████] 100% | 250/250 books | ETA: 0:00
✓ Scraped 250 books successfully
✓ Exported to: tim-brown_library_2025-10-28.json
```

#### 2. Specify Output Directory

```bash
# Save exports to custom directory
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --output-dir ./exports/
```

#### 3. Resume Interrupted Scrape

```bash
# Resume from checkpoint if scraping was interrupted
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --resume
```

### Library/Programmatic Interface

#### Basic Scraping

```python
from goodreads_explorer.lib import scrape_library
from goodreads_explorer.exporters import JSONExporter

# Scrape library
library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")

# Export to JSON
exporter = JSONExporter()
exporter.export(library, output_path="tim-brown_library.json")

# Access data
print(f"Total books: {library.total_books}")
print(f"Username: {library.username}")

# Iterate through books
for user_book in library.user_books:
    print(f"{user_book.book.title} by {user_book.book.author}")
    print(f"  Rating: {user_book.user_rating}/5")
    print(f"  Status: {user_book.reading_status}")
    print(f"  Shelves: {[s.name for s in user_book.shelves]}")
```

#### Advanced: Custom Filtering

```python
from goodreads_explorer.lib import scrape_library

library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")

# Filter books by rating
five_star_books = [
    ub for ub in library.user_books
    if ub.user_rating == 5
]

# Filter by reading status
currently_reading = [
    ub for ub in library.user_books
    if ub.reading_status == "currently-reading"
]

# Filter by shelf
favorites = [
    ub for ub in library.user_books
    if any(shelf.name == "favorites" for shelf in ub.shelves)
]

# Filter by genre
mystery_books = [
    ub for ub in library.user_books
    if "mystery" in ub.book.genres
]

print(f"5-star books: {len(five_star_books)}")
print(f"Currently reading: {len(currently_reading)}")
print(f"Favorites: {len(favorites)}")
print(f"Mystery books: {len(mystery_books)}")
```

#### Error Handling

```python
from goodreads_explorer.lib import scrape_library
from goodreads_explorer.exceptions import (
    InvalidURLError,
    PrivateProfileError,
    NetworkError,
    RateLimitError
)

try:
    library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")
except InvalidURLError as e:
    print(f"Invalid Goodreads URL: {e}")
except PrivateProfileError:
    print("Profile is private and cannot be scraped")
except RateLimitError:
    print("Rate limit exceeded. Please wait before retrying.")
except NetworkError as e:
    print(f"Network error: {e}. Check your internet connection.")
```

#### Progress Callbacks

```python
from goodreads_explorer.lib import scrape_library

def progress_callback(current, total, book_title):
    percentage = (current / total) * 100
    print(f"Progress: {percentage:.1f}% | {current}/{total} | {book_title}")

library = scrape_library(
    "https://www.goodreads.com/user/show/172435467-tim-brown",
    progress_callback=progress_callback
)
```

## Export Formats

### JSON Export

**File naming**: `{username}_library_{YYYY-MM-DD}.json`

**Structure**:
```json
{
  "user_id": "172435467",
  "username": "tim-brown",
  "profile_url": "https://www.goodreads.com/user/show/172435467-tim-brown",
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
        "page_count": 350,
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
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --format json \
  --output-dir ./backups/
```

### 2. Analyze Reading Patterns

```python
from goodreads_explorer.lib import scrape_library
from collections import Counter
from datetime import datetime

library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")

# Books read per year
books_by_year = Counter(
    ub.date_finished.year
    for ub in library.user_books
    if ub.date_finished
)

# Average rating
ratings = [ub.user_rating for ub in library.user_books if ub.user_rating]
avg_rating = sum(ratings) / len(ratings) if ratings else 0

# Most read genres
genre_counter = Counter()
for ub in library.user_books:
    genre_counter.update(ub.book.genres)

print(f"Books read by year: {dict(books_by_year)}")
print(f"Average rating: {avg_rating:.2f}")
print(f"Top 5 genres: {genre_counter.most_common(5)}")
```

### 3. Export for Spreadsheet Analysis

```bash
# Export to CSV for Excel
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --format csv

# Open in Excel or Google Sheets
# - Filter by rating, genre, shelves
# - Create pivot tables
# - Visualize reading patterns
```

### 4. Find Books to Re-read

```python
from goodreads_explorer.lib import scrape_library
from datetime import datetime, timedelta

library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")

# Find 5-star books read more than 2 years ago
two_years_ago = datetime.now() - timedelta(days=730)
reread_candidates = [
    ub for ub in library.user_books
    if ub.user_rating == 5
    and ub.date_finished
    and ub.date_finished < two_years_ago
]

# Sort by rating date (oldest first)
reread_candidates.sort(key=lambda ub: ub.date_finished or datetime.min)

print("Books to consider re-reading:")
for ub in reread_candidates[:10]:
    print(f"- {ub.book.title} by {ub.book.author}")
    print(f"  Read: {ub.date_finished.strftime('%Y-%m-%d')}")
```

## Rate Limiting

The scraper respects Goodreads rate limiting (1 request/second) automatically:

- **Large libraries**: 500 books = ~8 minutes, 1000 books = ~17 minutes
- **Progress indication**: Real-time progress bar shows ETA
- **Resume capability**: Interrupted scrapes can resume from last checkpoint

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
# Enable verbose logging
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --log-level DEBUG

# Log to file
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --log-file scrape.log
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
# Increase timeout
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --timeout 30

# Enable retries
python3 -m goodreads_explorer scrape \
  https://www.goodreads.com/user/show/172435467-tim-brown \
  --retries 3
```

### Issue: Missing book metadata

**Behavior**: Some books have `null` for ISBN, publication year, page count, etc.

**Explanation**: This is expected. Goodreads data quality varies. The scraper captures what's available and marks missing fields as `null`.

**Check**: Review validation warnings in logs to see which fields are missing.

## Testing

Run test suite to verify scraper functionality:

```bash
# Run all tests
pytest

# Run contract tests only
pytest tests/contract/

# Run with coverage report
pytest --cov=goodreads_explorer --cov-report=html
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
