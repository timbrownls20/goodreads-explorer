# CSV Export Contract Specification

**Version**: 1.0.0
**Date**: 2025-10-28
**Feature**: 001-scrape-goodreads-library

## Overview

This document defines the contract for CSV exports of Goodreads library data. CSV format provides a flattened, spreadsheet-compatible representation suitable for analysis in Excel, Google Sheets, or data analysis tools.

## File Naming Convention

```
{username}_library_{YYYY-MM-DD}.csv
```

**Examples**:
- `bookworm_library_2025-10-28.csv`
- `jane_doe_library_2025-12-15.csv`

## CSV Structure

### Encoding
- **Character Encoding**: UTF-8 with BOM (for Excel compatibility)
- **Line Endings**: CRLF (`\r\n`) for Windows/Excel compatibility
- **Delimiter**: Comma (`,`)
- **Quote Character**: Double quote (`"`)
- **Escape Method**: Double quote doubling (`""` for literal `"`)

### Header Row

The first row MUST contain column headers (case-sensitive):

```csv
user_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
```

### Column Definitions

| Column | Data Type | Required | Constraints | Description |
|--------|-----------|----------|-------------|-------------|
| `user_id` | String | Yes | Non-empty | Goodreads user ID |
| `username` | String | Yes | Non-empty | Goodreads username |
| `goodreads_book_id` | String | Yes | Non-empty | Unique Goodreads book ID |
| `title` | String | Yes | Non-empty, escaped | Book title |
| `author` | String | Yes | Non-empty, escaped | Primary author |
| `additional_authors` | String | No | Pipe-separated, escaped | Co-authors (`"Jane\|John"`) |
| `isbn` | String | No | Empty or valid ISBN | ISBN-10 or ISBN-13 |
| `isbn13` | String | No | Empty or 13 digits | ISBN-13 specifically |
| `publication_year` | Integer | No | Empty or 1000-2100 | Year published |
| `publisher` | String | No | Escaped | Publisher name |
| `page_count` | Integer | No | Empty or ≥ 1 | Number of pages |
| `language` | String | No | Empty or ISO 639-1 | Book language code |
| `genres` | String | No | Pipe-separated | Genres (`"fiction\|mystery"`) |
| `average_rating` | Float | No | Empty or 0.0-5.0 | Goodreads avg rating |
| `ratings_count` | Integer | No | Empty or ≥ 0 | Total Goodreads ratings |
| `user_rating` | Integer | No | Empty or 1-5 | User's rating |
| `reading_status` | Enum | Yes | `read\|currently-reading\|to-read` | Reading status |
| `shelf_name` | String | Yes | Non-empty | Shelf name (lowercased) |
| `is_builtin_shelf` | Boolean | Yes | `true\|false` | Is built-in shelf |
| `has_review` | Boolean | Yes | `true\|false` | Has user review |
| `review_text_preview` | String | No | Max 1000 chars, escaped | Review preview (truncated) |
| `review_date` | ISO 8601 | No | Empty or valid datetime | Review posted date |
| `likes_count` | Integer | No | Empty or ≥ 0 | Review likes |
| `date_added` | ISO 8601 | No | Empty or valid datetime | Added to library |
| `date_started` | ISO 8601 | No | Empty or valid datetime | Started reading |
| `date_finished` | ISO 8601 | No | Empty or valid datetime | Finished reading |
| `scraped_at` | ISO 8601 | Yes | Valid datetime | Extraction timestamp |
| `schema_version` | String | Yes | Semver format | Schema version |

### Multi-valued Field Encoding

**Shelves**: One row per shelf assignment
- A book on 3 shelves produces 3 rows with identical book data but different `shelf_name` and `is_builtin_shelf` values

**Genres**: Pipe-separated in single cell
- `"fiction|mystery|thriller"`
- Escaped if genre contains pipe: `"fiction|sci-fi\|fantasy"` → `"fiction|sci-fi||fantasy"`

**Additional Authors**: Pipe-separated
- `"Jane Doe|John Smith"`

### Empty/Null Value Encoding

| Data Type | Null Representation |
|-----------|---------------------|
| String | Empty string (no characters between delimiters) |
| Integer | Empty string |
| Float | Empty string |
| Boolean | Empty string (only for optional booleans) |
| DateTime | Empty string |

**Example with nulls**:
```csv
user_id,isbn,page_count,review_text_preview
12345,,,"Amazing book!"
12345,978-0123456789,350,
```

### Text Escaping

**Quote Escaping**: Double quotes in text fields are escaped by doubling
```
Original: She said "Hello"
CSV: "She said ""Hello"""
```

**Newlines in Review Text**: Preserved but quoted
```
Original: Great book!\nHighly recommend.
CSV: "Great book!
Highly recommend."
```

**Special Characters**: Commas, newlines, quotes require quoting
```csv
"Smith, John","Great book, highly recommend!","Contains ""quotes"" and
newlines"
```

## Row Generation Rules

### Shelf Expansion

A book on N shelves generates N rows:

**Input** (one book):
```json
{
  "book": {"title": "Example", "goodreads_id": "123"},
  "shelves": [
    {"name": "read", "is_builtin": true},
    {"name": "favorites", "is_builtin": false}
  ]
}
```

**Output** (two rows):
```csv
goodreads_book_id,title,shelf_name,is_builtin_shelf
123,"Example","read",true
123,"Example","favorites",false
```

### Review Text Truncation

- **Full review > 1000 chars**: Truncate to 997 chars + `"..."` ellipsis
- **Full review ≤ 1000 chars**: Include complete text
- **No review**: `has_review=false`, `review_text_preview=""`, `review_date=""`, `likes_count=""`

## Validation Rules

### Contract Tests MUST verify:

1. **Header Row**: First row matches expected column order exactly
2. **Data Types**: Each column conforms to specified type constraints
3. **Required Fields**: `user_id`, `username`, `goodreads_book_id`, `title`, `author`, `reading_status`, `shelf_name`, `is_builtin_shelf`, `has_review`, `scraped_at`, `schema_version` never empty
4. **Enum Values**: `reading_status` only contains valid values
5. **Shelf Expansion**: Each book-shelf combination generates one row
6. **UTF-8 Encoding**: File uses UTF-8 with BOM
7. **Escaping**: Special characters properly escaped
8. **Empty Values**: Null values represented as empty strings (no `NULL` text)

### Example Contract Test Assertions

```python
import csv
from pathlib import Path

def test_csv_contract(exported_csv: Path):
    with open(exported_csv, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        # Test header
        assert reader.fieldnames == [
            'user_id', 'username', 'goodreads_book_id', 'title',
            'author', 'additional_authors', 'isbn', 'isbn13',
            'publication_year', 'publisher', 'page_count', 'language',
            'genres', 'average_rating', 'ratings_count', 'user_rating',
            'reading_status', 'shelf_name', 'is_builtin_shelf',
            'has_review', 'review_text_preview', 'review_date',
            'likes_count', 'date_added', 'date_started', 'date_finished',
            'scraped_at', 'schema_version'
        ]

        for row in reader:
            # Required fields non-empty
            assert row['user_id']
            assert row['username']
            assert row['goodreads_book_id']
            assert row['title']
            assert row['author']
            assert row['reading_status'] in ['read', 'currently-reading', 'to-read']
            assert row['shelf_name']
            assert row['is_builtin_shelf'] in ['true', 'false']
            assert row['has_review'] in ['true', 'false']
            assert row['scraped_at']
            assert row['schema_version']

            # User rating if present
            if row['user_rating']:
                rating = int(row['user_rating'])
                assert 1 <= rating <= 5

            # Review consistency
            if row['has_review'] == 'true':
                assert row['review_text_preview']  # Must have preview

            # Review text length
            if row['review_text_preview']:
                assert len(row['review_text_preview']) <= 1000
```

## Backward Compatibility

Changes to this CSV contract MUST follow semantic versioning:

- **MAJOR**: Column removal, column reordering, breaking type changes
- **MINOR**: New columns added (always append to end)
- **PATCH**: Documentation clarifications, validation rule refinements

**Example Evolution**:
- v1.0.0 → v1.1.0: Add `series_name` column at end
- v1.1.0 → v2.0.0: Rename `shelf_name` to `shelf` (breaking change)

## Example Complete Row

```csv
user_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,bookworm,789456,"The Great Gatsby","F. Scott Fitzgerald",,978-0743273565,9780743273565,1925,"Scribner",180,en,"fiction|classics|american literature",3.93,4523678,5,read,read,true,true,"A masterpiece of American literature. Fitzgerald's prose is beautiful and the story is timeless. Highly recommended for anyone interested in the Jazz Age or classic American novels.",2025-01-15T14:30:00Z,42,2024-12-01T10:00:00Z,2025-01-01T08:00:00Z,2025-01-15T22:30:00Z,2025-10-28T10:30:00Z,1.0.0
12345,bookworm,789456,"The Great Gatsby","F. Scott Fitzgerald",,978-0743273565,9780743273565,1925,"Scribner",180,en,"fiction|classics|american literature",3.93,4523678,5,read,favorites,false,true,"A masterpiece of American literature. Fitzgerald's prose is beautiful and the story is timeless. Highly recommended for anyone interested in the Jazz Age or classic American novels.",2025-01-15T14:30:00Z,42,2024-12-01T10:00:00Z,2025-01-01T08:00:00Z,2025-01-15T22:30:00Z,2025-10-28T10:30:00Z,1.0.0
```

## Tooling Recommendations

**CSV Generation**:
- Python: `csv.DictWriter` with `quoting=csv.QUOTE_MINIMAL`
- Encoding: `open(file, 'w', encoding='utf-8-sig', newline='')`

**CSV Validation**:
- `pytest` with `csv.DictReader`
- `pandas.read_csv()` for schema validation
- JSON Schema CSV validator tools

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Initial CSV export contract |
