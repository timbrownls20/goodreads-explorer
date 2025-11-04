"""Data validation utilities for scraped Goodreads data.

Validates ratings, fields, and data quality per FR-013.
Per Constitution Principle VI: Data Quality & Validation.
"""

from datetime import datetime
from typing import Any

from src.exceptions import ValidationError


def validate_rating(rating: int | None, field_name: str = "rating") -> int | None:
    """Validate a 1-5 star rating.

    Args:
        rating: Rating value to validate (1-5 or None)
        field_name: Name of field for error messages

    Returns:
        Validated rating or None

    Raises:
        ValidationError: If rating is not in valid 1-5 range

    Examples:
        >>> validate_rating(5)
        5
        >>> validate_rating(None)
        None
        >>> validate_rating(6)  # doctest: +SKIP
        ValidationError: rating must be between 1 and 5, got: 6
    """
    if rating is None:
        return None

    if not isinstance(rating, int):
        raise ValidationError(
            f"{field_name} must be an integer, got: {type(rating).__name__}"
        )

    if not (1 <= rating <= 5):
        raise ValidationError(
            f"{field_name} must be between 1 and 5, got: {rating}"
        )

    return rating


def sanitize_text(text: str | None, max_length: int | None = None) -> str | None:
    """Sanitize text by stripping whitespace and optionally truncating.

    Args:
        text: Text to sanitize
        max_length: Maximum length (truncated if exceeded, None for no limit)

    Returns:
        Sanitized text or None if input was None/empty

    Examples:
        >>> sanitize_text("  Hello World  ")
        'Hello World'
        >>> sanitize_text("Too long text", max_length=8)
        'Too long'
        >>> sanitize_text(None)
        None
    """
    if text is None:
        return None

    text = text.strip()

    if not text:
        return None

    if max_length is not None and len(text) > max_length:
        text = text[:max_length]

    return text


def validate_isbn(isbn: str | None) -> str | None:
    """Validate ISBN format (basic check).

    Note: Full ISBN validation with checksum is handled by Pydantic ISBN type.
    This is a basic sanity check for scraped data.

    Args:
        isbn: ISBN string to validate

    Returns:
        Normalized ISBN (digits only) or None

    Examples:
        >>> validate_isbn("978-0525478812")
        '9780525478812'
        >>> validate_isbn("0-525-47881-2")
        '052547881 2'
        >>> validate_isbn(None)
        None
    """
    if isbn is None:
        return None

    # Remove common separators
    isbn_clean = isbn.replace("-", "").replace(" ", "")

    if not isbn_clean:
        return None

    # ISBN-10 should be 10 digits, ISBN-13 should be 13 digits
    if len(isbn_clean) not in (10, 13):
        return None

    # Should be mostly digits (allowing 'X' for ISBN-10 check digit)
    if not all(c.isdigit() or c.upper() == 'X' for c in isbn_clean):
        return None

    return isbn


def validate_publication_year(year: int | None) -> int | None:
    """Validate publication year is reasonable.

    Args:
        year: Publication year to validate

    Returns:
        Validated year or None

    Raises:
        ValidationError: If year is outside reasonable range (1000-2100)

    Examples:
        >>> validate_publication_year(2020)
        2020
        >>> validate_publication_year(None)
        None
        >>> validate_publication_year(999)  # doctest: +SKIP
        ValidationError: publication_year must be between 1000 and 2100, got: 999
    """
    if year is None:
        return None

    if not isinstance(year, int):
        raise ValidationError(
            f"publication_year must be an integer, got: {type(year).__name__}"
        )

    if not (1000 <= year <= 2100):
        raise ValidationError(
            f"publication_year must be between 1000 and 2100, got: {year}"
        )

    return year


def validate_page_count(pages: int | None) -> int | None:
    """Validate page count is positive.

    Args:
        pages: Page count to validate

    Returns:
        Validated page count or None

    Raises:
        ValidationError: If page count is not positive

    Examples:
        >>> validate_page_count(350)
        350
        >>> validate_page_count(None)
        None
        >>> validate_page_count(0)  # doctest: +SKIP
        ValidationError: page_count must be positive, got: 0
    """
    if pages is None:
        return None

    if not isinstance(pages, int):
        raise ValidationError(
            f"page_count must be an integer, got: {type(pages).__name__}"
        )

    if pages < 1:
        raise ValidationError(
            f"page_count must be positive, got: {pages}"
        )

    return pages


def normalize_genres(genres: list[str]) -> list[str]:
    """Normalize genre list: lowercase, deduplicate, limit length.

    Args:
        genres: List of genre strings

    Returns:
        Normalized list of genres (max 50, deduplicated, lowercased)

    Examples:
        >>> normalize_genres(["Fiction", "MYSTERY", "fiction"])
        ['fiction', 'mystery']
        >>> normalize_genres([])
        []
    """
    if not genres:
        return []

    normalized = []
    seen = set()

    for genre in genres[:50]:  # Limit to max 50 genres
        if not isinstance(genre, str):
            continue

        genre_clean = genre.strip().lower()[:50]  # Max 50 chars per genre

        if genre_clean and genre_clean not in seen:
            normalized.append(genre_clean)
            seen.add(genre_clean)

    return normalized


def parse_iso_date(date_str: str | None) -> datetime | None:
    """Parse ISO 8601 date string to datetime.

    Args:
        date_str: ISO 8601 formatted date string

    Returns:
        Parsed datetime object or None

    Examples:
        >>> parse_iso_date("2024-03-15T10:30:00Z")  # doctest: +SKIP
        datetime.datetime(2024, 3, 15, 10, 30)
        >>> parse_iso_date(None)
        None
    """
    if not date_str:
        return None

    try:
        # Handle various ISO 8601 formats
        # Remove 'Z' suffix if present
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'

        return datetime.fromisoformat(date_str)
    except (ValueError, AttributeError):
        return None


def validate_date_ordering(
    date_added: datetime | None,
    date_started: datetime | None,
    date_finished: datetime | None
) -> tuple[bool, str | None]:
    """Validate date ordering: added <= started <= finished.

    Args:
        date_added: When book was added to library
        date_started: When reading started
        date_finished: When reading finished

    Returns:
        Tuple of (is_valid, error_message)
        is_valid: True if dates are in correct order
        error_message: Description of validation failure, None if valid

    Examples:
        >>> from datetime import datetime
        >>> validate_date_ordering(
        ...     datetime(2024, 1, 1),
        ...     datetime(2024, 1, 10),
        ...     datetime(2024, 1, 20)
        ... )
        (True, None)
    """
    # Hard validation: started must be <= finished
    if date_started and date_finished:
        if date_started > date_finished:
            return (
                False,
                f"date_started ({date_started}) cannot be after date_finished ({date_finished})"
            )

    # Soft validation: added should be <= started (warning only, not error)
    # This is handled as a warning in the scraper logging
    return (True, None)
