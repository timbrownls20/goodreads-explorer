"""CSV export functionality for Goodreads library data.

Exports Library objects to flattened CSV format per contracts/csv-export-spec.md.
Per Constitution Principle IV: Contract testing for CSV format.
"""

import csv
from datetime import datetime
from pathlib import Path

from src.models import Library
from src.logging_config import get_logger

logger = get_logger(__name__)


# CSV headers per contract specification
CSV_HEADERS = [
    "user_id", "username", "goodreads_book_id", "title", "author",
    "additional_authors", "isbn", "isbn13", "publication_year", "publisher",
    "page_count", "language", "genres", "average_rating", "ratings_count",
    "user_rating", "reading_status", "shelf_name", "is_builtin_shelf",
    "has_review", "review_text_preview", "review_date", "likes_count",
    "date_added", "date_started", "date_finished", "scraped_at", "schema_version"
]


def export_to_csv(library: Library, output_path: Path | str) -> None:
    """Export library to CSV file.

    Args:
        library: Library object to export
        output_path: Path to output CSV file

    Raises:
        IOError: If file cannot be written

    Example:
        >>> library = Library(...)
        >>> export_to_csv(library, "library_export.csv")
    """
    output_path = Path(output_path)

    # Convert library to CSV rows
    rows = library_to_csv_rows(library)

    # Write to CSV with UTF-8 BOM for Excel compatibility
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    logger.info(
        "CSV export complete",
        output_path=str(output_path),
        file_size_bytes=output_path.stat().st_size,
        total_books=library.total_books,
        total_rows=len(rows)
    )


def library_to_csv_rows(library: Library) -> list[dict]:
    """Convert Library to CSV row dictionaries.

    Books on multiple shelves produce multiple rows (one per shelf).

    Args:
        library: Library object

    Returns:
        List of dictionaries, one per CSV row

    Example:
        >>> library = Library(...)
        >>> rows = library_to_csv_rows(library)
        >>> assert len(rows) >= library.total_books
    """
    rows = []

    for user_book in library.user_books:
        # One row per shelf assignment
        for shelf in user_book.shelves:
            row = {
                # User metadata
                "user_id": library.user_id,
                "username": library.username,

                # Book metadata
                "goodreads_book_id": user_book.book.goodreads_id,
                "title": user_book.book.title,
                "author": user_book.book.author,
                "additional_authors": _format_list_field(user_book.book.additional_authors),
                "isbn": str(user_book.book.isbn) if user_book.book.isbn else "",
                "isbn13": user_book.book.isbn13 or "",
                "publication_year": user_book.book.publication_year or "",
                "publisher": user_book.book.publisher or "",
                "page_count": user_book.book.page_count or "",
                "language": user_book.book.language or "",
                "genres": _format_list_field(user_book.book.genres),
                "average_rating": user_book.book.average_rating or "",
                "ratings_count": user_book.book.ratings_count or "",

                # User-book relationship
                "user_rating": user_book.user_rating or "",
                "reading_status": user_book.reading_status.value,

                # Shelf information (one row per shelf)
                "shelf_name": shelf.name,
                "is_builtin_shelf": "true" if shelf.is_builtin else "false",

                # Review data
                "has_review": "true" if user_book.review else "false",
                "review_text_preview": _truncate_review(user_book.review.review_text) if user_book.review else "",
                "review_date": _format_datetime(user_book.review.review_date) if user_book.review and user_book.review.review_date else "",
                "likes_count": user_book.review.likes_count if user_book.review else "",

                # Reading dates
                # For books with multiple reads, use the most recent read record
                "date_added": _format_datetime(user_book.date_added),
                "date_started": _format_datetime(user_book.read_records[-1].date_started) if user_book.read_records else "",
                "date_finished": _format_datetime(user_book.read_records[-1].date_finished) if user_book.read_records else "",

                # Export metadata
                "scraped_at": _format_datetime(library.scraped_at),
                "schema_version": library.schema_version
            }

            rows.append(row)

    return rows


def _format_list_field(items: list[str]) -> str:
    """Format list of strings as pipe-separated value.

    Args:
        items: List of strings

    Returns:
        Pipe-separated string (e.g., "item1|item2|item3")

    Example:
        >>> _format_list_field(["fiction", "mystery"])
        'fiction|mystery'
    """
    if not items:
        return ""

    # Join with pipe separator
    return "|".join(items)


def _truncate_review(review_text: str, max_length: int = 1000) -> str:
    """Truncate review text to max length with ellipsis.

    Args:
        review_text: Full review text
        max_length: Maximum length (default 1000 chars per contract)

    Returns:
        Truncated text with "..." suffix if truncated

    Example:
        >>> _truncate_review("A" * 1500)[:10]
        'AAAAAAAAAA'
        >>> len(_truncate_review("A" * 1500))
        1000
    """
    if not review_text:
        return ""

    if len(review_text) <= max_length:
        return review_text

    # Truncate to max_length - 3 and add ellipsis
    return review_text[:max_length - 3] + "..."


def _format_datetime(dt: datetime | None) -> str:
    """Format datetime to ISO 8601 string.

    Args:
        dt: Datetime object or None

    Returns:
        ISO 8601 formatted string or empty string

    Example:
        >>> from datetime import datetime
        >>> _format_datetime(datetime(2024, 3, 15, 10, 30))
        '2024-03-15T10:30:00Z'
    """
    if dt is None:
        return ""

    # Format as ISO 8601 with Z suffix (UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
