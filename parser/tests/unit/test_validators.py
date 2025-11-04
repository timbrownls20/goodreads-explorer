"""Unit tests for validation utilities.

Tests URL validation, data validation, and edge cases.
Per Constitution Principle III: TDD with comprehensive validation testing.
"""

from datetime import datetime
import pytest

from src.exceptions import InvalidURLError, ValidationError
from src.validators import (
    extract_user_id_from_url,
    is_goodreads_book_url,
    normalize_genres,
    normalize_profile_url,
    parse_iso_date,
    sanitize_text,
    validate_date_ordering,
    validate_goodreads_profile_url,
    validate_isbn,
    validate_page_count,
    validate_publication_year,
    validate_rating,
)


class TestURLValidator:
    """Tests for URL validation functions."""

    def test_valid_goodreads_profile_url(self):
        """Test validation of valid Goodreads profile URLs."""
        valid_urls = [
            "https://www.goodreads.com/user/show/12345-username",
            "http://www.goodreads.com/user/show/12345",
            "https://goodreads.com/user/show/12345-some-user",
            "https://www.goodreads.com/user/show/123",
        ]

        for url in valid_urls:
            is_valid, normalized, user_id = validate_goodreads_profile_url(url)
            assert is_valid is True
            assert user_id is not None
            assert "https://" in normalized

    def test_invalid_goodreads_urls(self):
        """Test validation rejects invalid URLs."""
        invalid_urls = [
            "https://example.com",
            "https://www.goodreads.com/book/show/123",  # Book URL, not profile
            "https://www.goodreads.com/author/show/123",  # Author URL
            "not-a-url",
            "",
            "https://www.goodreads.com/user/",
        ]

        for url in invalid_urls:
            is_valid, _, user_id = validate_goodreads_profile_url(url)
            assert is_valid is False
            assert user_id is None

    def test_extract_user_id_from_url(self):
        """Test extracting user ID from profile URL."""
        url = "https://www.goodreads.com/user/show/12345-testuser"
        user_id = extract_user_id_from_url(url)
        assert user_id == "12345"

    def test_extract_user_id_invalid_url_raises_error(self):
        """Test that invalid URL raises InvalidURLError."""
        with pytest.raises(InvalidURLError):
            extract_user_id_from_url("https://example.com")

    def test_normalize_profile_url(self):
        """Test URL normalization."""
        url = "http://goodreads.com/user/show/12345-testuser"
        normalized = normalize_profile_url(url)

        assert normalized.startswith("https://")
        assert "www.goodreads.com" in normalized
        assert "12345" in normalized

    def test_is_goodreads_book_url(self):
        """Test detection of book URLs vs profile URLs."""
        assert is_goodreads_book_url("https://www.goodreads.com/book/show/123") is True
        assert is_goodreads_book_url("https://www.goodreads.com/user/show/123") is False


class TestDataValidator:
    """Tests for data validation functions."""

    def test_validate_rating_valid_range(self):
        """Test rating validation for valid 1-5 range."""
        for rating in range(1, 6):
            assert validate_rating(rating) == rating

    def test_validate_rating_none_allowed(self):
        """Test that None rating is allowed."""
        assert validate_rating(None) is None

    def test_validate_rating_out_of_range(self):
        """Test that ratings outside 1-5 raise ValidationError."""
        with pytest.raises(ValidationError):
            validate_rating(0)

        with pytest.raises(ValidationError):
            validate_rating(6)

    def test_sanitize_text_strips_whitespace(self):
        """Test text sanitization strips leading/trailing whitespace."""
        assert sanitize_text("  Hello World  ") == "Hello World"

    def test_sanitize_text_truncates(self):
        """Test text truncation to max length."""
        long_text = "A" * 100
        sanitized = sanitize_text(long_text, max_length=50)
        assert len(sanitized) == 50

    def test_sanitize_text_empty_returns_none(self):
        """Test that empty or whitespace-only text returns None."""
        assert sanitize_text("") is None
        assert sanitize_text("   ") is None
        assert sanitize_text(None) is None

    def test_validate_isbn_formats(self):
        """Test ISBN validation accepts both ISBN-10 and ISBN-13."""
        isbn10 = "0525478812"
        isbn13 = "9780525478812"

        assert validate_isbn(isbn10) == isbn10
        assert validate_isbn(isbn13) == isbn13

    def test_validate_isbn_with_hyphens(self):
        """Test ISBN validation strips hyphens."""
        isbn_with_hyphens = "978-0-525-47881-2"
        cleaned = validate_isbn(isbn_with_hyphens)
        assert "-" not in cleaned

    def test_validate_isbn_none_allowed(self):
        """Test that None ISBN is allowed."""
        assert validate_isbn(None) is None

    def test_validate_publication_year_valid(self):
        """Test publication year validation for valid range."""
        assert validate_publication_year(2020) == 2020
        assert validate_publication_year(1000) == 1000
        assert validate_publication_year(2100) == 2100

    def test_validate_publication_year_out_of_range(self):
        """Test that years outside 1000-2100 raise ValidationError."""
        with pytest.raises(ValidationError):
            validate_publication_year(999)

        with pytest.raises(ValidationError):
            validate_publication_year(2101)

    def test_validate_publication_year_none_allowed(self):
        """Test that None publication year is allowed."""
        assert validate_publication_year(None) is None

    def test_validate_page_count_positive(self):
        """Test page count must be positive."""
        assert validate_page_count(350) == 350
        assert validate_page_count(1) == 1

        with pytest.raises(ValidationError):
            validate_page_count(0)

        with pytest.raises(ValidationError):
            validate_page_count(-10)

    def test_validate_page_count_none_allowed(self):
        """Test that None page count is allowed."""
        assert validate_page_count(None) is None

    def test_normalize_genres(self):
        """Test genre normalization: lowercase, deduplicate."""
        genres = ["Fiction", "MYSTERY", "fiction", "Thriller"]
        normalized = normalize_genres(genres)

        assert "fiction" in normalized
        assert "mystery" in normalized
        assert "thriller" in normalized
        assert len(normalized) == 3  # Deduplicated

    def test_normalize_genres_empty_list(self):
        """Test normalization of empty genre list."""
        assert normalize_genres([]) == []

    def test_parse_iso_date_valid(self):
        """Test parsing valid ISO 8601 dates."""
        date_str = "2024-03-15T10:30:00Z"
        parsed = parse_iso_date(date_str)

        assert parsed is not None
        assert parsed.year == 2024
        assert parsed.month == 3
        assert parsed.day == 15

    def test_parse_iso_date_none(self):
        """Test that None date returns None."""
        assert parse_iso_date(None) is None

    def test_parse_iso_date_invalid(self):
        """Test that invalid date string returns None."""
        assert parse_iso_date("not-a-date") is None
        assert parse_iso_date("") is None

    def test_validate_date_ordering_valid(self):
        """Test date ordering validation for valid sequence."""
        date_added = datetime(2024, 1, 1)
        date_started = datetime(2024, 1, 10)
        date_finished = datetime(2024, 1, 20)

        is_valid, error = validate_date_ordering(date_added, date_started, date_finished)
        assert is_valid is True
        assert error is None

    def test_validate_date_ordering_invalid(self):
        """Test date ordering validation detects started > finished error."""
        date_started = datetime(2024, 1, 20)
        date_finished = datetime(2024, 1, 10)

        is_valid, error = validate_date_ordering(None, date_started, date_finished)
        assert is_valid is False
        assert error is not None
        assert "date_started" in error
        assert "date_finished" in error

    def test_validate_date_ordering_with_nones(self):
        """Test date ordering validation handles None dates."""
        # All None
        is_valid, error = validate_date_ordering(None, None, None)
        assert is_valid is True
        assert error is None

        # Partial dates
        is_valid, error = validate_date_ordering(
            datetime(2024, 1, 1),
            None,
            datetime(2024, 1, 20)
        )
        assert is_valid is True
