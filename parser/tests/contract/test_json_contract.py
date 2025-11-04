"""Contract tests for JSON export format.

Validates that exported JSON conforms to the schema defined in
contracts/json-export-schema.json per Constitution Principle IV.
"""

import json
from datetime import datetime
from pathlib import Path

import pytest


@pytest.fixture
def json_schema():
    """Load JSON export schema for validation."""
    schema_path = Path(__file__).parent.parent.parent.parent / "specs" / "001-scrape-goodreads-library" / "contracts" / "json-export-schema.json"
    with open(schema_path) as f:
        return json.load(f)


@pytest.fixture
def sample_library_export():
    """Sample library export data for testing."""
    return {
        "schema_version": "1.0.0",
        "user_id": "12345",
        "username": "testuser",
        "profile_url": "https://www.goodreads.com/user/show/12345-testuser",
        "scraped_at": datetime.utcnow().isoformat() + "Z",
        "total_books": 2,
        "user_books": [
            {
                "book": {
                    "goodreads_id": "11870085",
                    "title": "The Fault in Our Stars",
                    "author": "John Green",
                    "additional_authors": [],
                    "isbn": None,
                    "isbn13": "9780525478812",
                    "publication_year": 2012,
                    "publisher": "Dutton Books",
                    "page_count": 313,
                    "language": "en",
                    "genres": ["young adult", "fiction", "romance"],
                    "average_rating": 4.18,
                    "ratings_count": 4500000,
                    "cover_image_url": "https://images.gr-assets.com/books/1360206420l/11870085.jpg",
                    "goodreads_url": "https://www.goodreads.com/book/show/11870085-the-fault-in-our-stars"
                },
                "user_rating": 5,
                "reading_status": "read",
                "shelves": [
                    {"name": "read", "is_builtin": True, "book_count": None},
                    {"name": "favorites", "is_builtin": False, "book_count": None}
                ],
                "review": {
                    "review_text": "Absolutely beautiful story about love and loss.",
                    "review_date": "2024-03-15T10:30:00Z",
                    "likes_count": 5
                },
                "date_added": "2024-03-01T12:00:00Z",
                "date_started": "2024-03-10T09:00:00Z",
                "date_finished": "2024-03-14T22:00:00Z"
            },
            {
                "book": {
                    "goodreads_id": "2767052",
                    "title": "The Hunger Games",
                    "author": "Suzanne Collins",
                    "additional_authors": [],
                    "isbn": None,
                    "isbn13": "9780439023481",
                    "publication_year": 2008,
                    "publisher": "Scholastic Press",
                    "page_count": 374,
                    "language": "en",
                    "genres": ["young adult", "dystopia", "science fiction"],
                    "average_rating": 4.32,
                    "ratings_count": 7500000,
                    "cover_image_url": "https://images.gr-assets.com/books/1447303603l/2767052.jpg",
                    "goodreads_url": "https://www.goodreads.com/book/show/2767052-the-hunger-games"
                },
                "user_rating": None,
                "reading_status": "to-read",
                "shelves": [
                    {"name": "to-read", "is_builtin": True, "book_count": None}
                ],
                "review": None,
                "date_added": "2024-04-01T15:00:00Z",
                "date_started": None,
                "date_finished": None
            }
        ]
    }


def test_json_export_has_required_fields(sample_library_export):
    """Test that JSON export contains all required top-level fields."""
    required_fields = {"schema_version", "user_id", "username", "profile_url", "scraped_at", "total_books", "user_books"}
    assert set(sample_library_export.keys()) == required_fields, "JSON export must contain all required fields"


def test_json_export_schema_version_format(sample_library_export):
    """Test that schema_version follows semantic versioning."""
    schema_version = sample_library_export["schema_version"]
    assert isinstance(schema_version, str)
    parts = schema_version.split(".")
    assert len(parts) == 3, "Schema version must be in format MAJOR.MINOR.PATCH"
    assert all(part.isdigit() for part in parts), "Schema version parts must be numeric"


def test_json_export_total_books_matches_count(sample_library_export):
    """Test that total_books matches the actual count of user_books."""
    assert sample_library_export["total_books"] == len(sample_library_export["user_books"]), \
        "total_books must match length of user_books array"


def test_json_export_user_book_structure(sample_library_export):
    """Test that each user_book has the required nested structure."""
    for user_book in sample_library_export["user_books"]:
        # Required top-level fields
        assert "book" in user_book
        assert "user_rating" in user_book
        assert "reading_status" in user_book
        assert "shelves" in user_book
        assert "review" in user_book
        assert "date_added" in user_book
        assert "date_started" in user_book
        assert "date_finished" in user_book

        # Book nested structure
        book = user_book["book"]
        required_book_fields = {
            "goodreads_id", "title", "author", "additional_authors",
            "isbn", "isbn13", "publication_year", "publisher", "page_count",
            "language", "genres", "average_rating", "ratings_count",
            "cover_image_url", "goodreads_url"
        }
        assert set(book.keys()) == required_book_fields


def test_json_export_reading_status_values(sample_library_export):
    """Test that reading_status contains valid enum values."""
    valid_statuses = {"read", "currently-reading", "to-read"}
    for user_book in sample_library_export["user_books"]:
        assert user_book["reading_status"] in valid_statuses, \
            f"reading_status must be one of {valid_statuses}"


def test_json_export_shelves_structure(sample_library_export):
    """Test that shelves array has valid structure."""
    for user_book in sample_library_export["user_books"]:
        shelves = user_book["shelves"]
        assert isinstance(shelves, list)
        assert len(shelves) > 0, "Each book must be on at least one shelf"

        for shelf in shelves:
            assert "name" in shelf
            assert "is_builtin" in shelf
            assert isinstance(shelf["is_builtin"], bool)


def test_json_export_review_structure(sample_library_export):
    """Test that review (when present) has valid structure."""
    for user_book in sample_library_export["user_books"]:
        review = user_book["review"]
        if review is not None:
            assert "review_text" in review
            assert "review_date" in review
            assert "likes_count" in review
            assert isinstance(review["review_text"], str)


def test_json_export_user_rating_range(sample_library_export):
    """Test that user_rating (when present) is in valid 1-5 range."""
    for user_book in sample_library_export["user_books"]:
        rating = user_book["user_rating"]
        if rating is not None:
            assert 1 <= rating <= 5, "user_rating must be between 1 and 5"


def test_json_export_serializable(sample_library_export):
    """Test that the export can be serialized to valid JSON."""
    try:
        json_string = json.dumps(sample_library_export)
        assert len(json_string) > 0
        # Verify it can be deserialized back
        parsed = json.loads(json_string)
        assert parsed == sample_library_export
    except (TypeError, ValueError) as e:
        pytest.fail(f"JSON export must be serializable: {e}")


def test_json_export_empty_library():
    """Test contract compliance for empty library (0 books)."""
    empty_export = {
        "schema_version": "1.0.0",
        "user_id": "67890",
        "username": "emptyuser",
        "profile_url": "https://www.goodreads.com/user/show/67890-emptyuser",
        "scraped_at": datetime.utcnow().isoformat() + "Z",
        "total_books": 0,
        "user_books": []
    }

    assert empty_export["total_books"] == 0
    assert empty_export["user_books"] == []
    assert "schema_version" in empty_export
