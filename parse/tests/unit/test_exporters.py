"""Unit tests for export functionality.

Tests JSON and CSV exporters for contract compliance.
Per Constitution Principle III: TDD with export testing.
"""

import json
from datetime import datetime
from pathlib import Path
import pytest
import tempfile

from parse.src.models import Book, Library, ReadingStatus, Shelf, UserBookRelation
from parse.src.exporters import (
    export_to_json,
    export_to_csv,
    library_to_json_dict,
    library_to_csv_rows,
)


@pytest.fixture
def sample_library():
    """Sample library for testing exports."""
    book = Book(
        goodreads_id="11870085",
        title="The Fault in Our Stars",
        author="John Green",
        goodreads_url="https://www.goodreads.com/book/show/11870085"
    )

    user_book = UserBookRelation(
        book=book,
        user_rating=5,
        reading_status=ReadingStatus.READ,
        shelves=[Shelf(name="read", is_builtin=True)]
    )

    library = Library(
        user_id="12345",
        username="testuser",
        profile_url="https://www.goodreads.com/user/show/12345-testuser",
        user_books=[user_book]
    )

    return library


class TestJSONExporter:
    """Tests for JSON export functionality."""

    def test_library_to_json_dict_contains_required_fields(self, sample_library):
        """Test that JSON dict contains all required top-level fields."""
        json_dict = library_to_json_dict(sample_library)

        required_fields = {
            "user_id", "username", "profile_url",
            "user_books", "scraped_at", "schema_version", "total_books"
        }

        assert set(json_dict.keys()).issuperset(required_fields)

    def test_library_to_json_dict_total_books_matches(self, sample_library):
        """Test that total_books matches user_books length."""
        json_dict = library_to_json_dict(sample_library)

        assert json_dict["total_books"] == len(json_dict["user_books"])
        assert json_dict["total_books"] == sample_library.total_books

    def test_export_to_json_creates_file(self, sample_library):
        """Test that JSON file is created successfully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "test_library.json"

            export_to_json(sample_library, output_path)

            assert output_path.exists()
            assert output_path.stat().st_size > 0

    def test_export_to_json_valid_json(self, sample_library):
        """Test that exported JSON is valid and parseable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "test_library.json"

            export_to_json(sample_library, output_path)

            # Verify valid JSON
            with open(output_path) as f:
                data = json.load(f)

            assert data["user_id"] == "12345"
            assert data["username"] == "testuser"


class TestCSVExporter:
    """Tests for CSV export functionality."""

    def test_library_to_csv_rows_creates_rows(self, sample_library):
        """Test that CSV rows are created for library."""
        rows = library_to_csv_rows(sample_library)

        assert len(rows) >= 1
        assert all(isinstance(row, dict) for row in rows)

    def test_csv_row_contains_required_columns(self, sample_library):
        """Test that CSV rows contain all required columns."""
        rows = library_to_csv_rows(sample_library)
        first_row = rows[0]

        required_columns = {
            "user_id", "username", "goodreads_book_id", "title", "author",
            "reading_status", "shelf_name", "schema_version"
        }

        assert set(first_row.keys()).issuperset(required_columns)

    def test_csv_multi_shelf_expansion(self):
        """Test that books on multiple shelves create multiple rows."""
        book = Book(
            goodreads_id="123",
            title="Test Book",
            author="Test Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        user_book = UserBookRelation(
            book=book,
            reading_status=ReadingStatus.READ,
            shelves=[
                Shelf(name="read", is_builtin=True),
                Shelf(name="favorites", is_builtin=False)
            ]
        )

        library = Library(
            user_id="123",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/123",
            user_books=[user_book]
        )

        rows = library_to_csv_rows(library)

        # Should have 2 rows (one per shelf)
        assert len(rows) == 2
        assert rows[0]["shelf_name"] == "read"
        assert rows[1]["shelf_name"] == "favorites"

    def test_export_to_csv_creates_file(self, sample_library):
        """Test that CSV file is created successfully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "test_library.csv"

            export_to_csv(sample_library, output_path)

            assert output_path.exists()
            assert output_path.stat().st_size > 0

    def test_csv_boolean_format(self, sample_library):
        """Test that boolean fields use lowercase 'true'/'false'."""
        rows = library_to_csv_rows(sample_library)
        first_row = rows[0]

        assert first_row["is_builtin_shelf"] in ("true", "false")
        assert first_row["has_review"] in ("true", "false")

    def test_csv_review_truncation(self):
        """Test that review text is truncated to 1000 chars."""
        from parse.src.exporters.csv_exporter import _truncate_review

        long_review = "A" * 1500
        truncated = _truncate_review(long_review)

        assert len(truncated) == 1000
        assert truncated.endswith("...")
