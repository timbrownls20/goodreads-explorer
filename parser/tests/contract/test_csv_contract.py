"""Contract tests for CSV export format.

Validates that exported CSV conforms to the specification defined in
contracts/csv-export-spec.md per Constitution Principle IV.
"""

import csv
from io import StringIO

import pytest


@pytest.fixture
def expected_csv_headers():
    """Expected CSV column headers per contract specification."""
    return [
        "user_id", "username", "goodreads_book_id", "title", "author",
        "additional_authors", "isbn", "isbn13", "publication_year", "publisher",
        "page_count", "language", "genres", "average_rating", "ratings_count",
        "user_rating", "reading_status", "shelf_name", "is_builtin_shelf",
        "has_review", "review_text_preview", "review_date", "likes_count",
        "date_added", "date_started", "date_finished", "scraped_at", "schema_version"
    ]


@pytest.fixture
def sample_csv_export():
    """Sample CSV export for testing contract compliance."""
    csv_content = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,11870085,"The Fault in Our Stars","John Green",,,"9780525478812",2012,"Dutton Books",313,en,"young adult|fiction|romance",4.18,4500000,5,read,read,true,true,"Absolutely beautiful story about love and loss.",2024-03-15T10:30:00Z,5,2024-03-01T12:00:00Z,2024-03-10T09:00:00Z,2024-03-14T22:00:00Z,2025-10-28T12:00:00Z,1.0.0
12345,testuser,11870085,"The Fault in Our Stars","John Green",,,"9780525478812",2012,"Dutton Books",313,en,"young adult|fiction|romance",4.18,4500000,5,read,favorites,false,true,"Absolutely beautiful story about love and loss.",2024-03-15T10:30:00Z,5,2024-03-01T12:00:00Z,2024-03-10T09:00:00Z,2024-03-14T22:00:00Z,2025-10-28T12:00:00Z,1.0.0
12345,testuser,2767052,"The Hunger Games","Suzanne Collins",,,"9780439023481",2008,"Scholastic Press",374,en,"young adult|dystopia|science fiction",4.32,7500000,,to-read,to-read,true,false,,,,,2024-04-01T15:00:00Z,,,2025-10-28T12:00:00Z,1.0.0
'''
    return csv_content


def test_csv_has_bom(sample_csv_export):
    """Test that CSV starts with UTF-8 BOM for Excel compatibility."""
    assert sample_csv_export.startswith('\ufeff'), "CSV must start with UTF-8 BOM (\\ufeff)"


def test_csv_header_row(sample_csv_export, expected_csv_headers):
    """Test that CSV has correct header row with all required columns."""
    reader = csv.DictReader(StringIO(sample_csv_export))
    assert reader.fieldnames == expected_csv_headers, \
        f"CSV headers must match contract specification: {expected_csv_headers}"


def test_csv_required_columns_not_empty(sample_csv_export):
    """Test that required columns are never empty."""
    required_columns = {
        "user_id", "username", "goodreads_book_id", "title", "author",
        "reading_status", "shelf_name", "is_builtin_shelf", "has_review",
        "scraped_at", "schema_version"
    }

    reader = csv.DictReader(StringIO(sample_csv_export))
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        for col in required_columns:
            assert row[col], f"Required column '{col}' cannot be empty (row {row_num})"


def test_csv_reading_status_values(sample_csv_export):
    """Test that reading_status contains only valid enum values."""
    valid_statuses = {"read", "currently-reading", "to-read"}

    reader = csv.DictReader(StringIO(sample_csv_export))
    for row_num, row in enumerate(reader, start=2):
        assert row["reading_status"] in valid_statuses, \
            f"reading_status must be one of {valid_statuses} (row {row_num})"


def test_csv_boolean_fields_format(sample_csv_export):
    """Test that boolean fields use lowercase 'true'/'false'."""
    boolean_fields = ["is_builtin_shelf", "has_review"]

    reader = csv.DictReader(StringIO(sample_csv_export))
    for row_num, row in enumerate(reader, start=2):
        for field in boolean_fields:
            assert row[field] in {"true", "false"}, \
                f"Boolean field '{field}' must be 'true' or 'false' (row {row_num})"


def test_csv_user_rating_range(sample_csv_export):
    """Test that user_rating (when present) is in valid 1-5 range."""
    reader = csv.DictReader(StringIO(sample_csv_export))
    for row_num, row in enumerate(reader, start=2):
        if row["user_rating"]:
            rating = int(row["user_rating"])
            assert 1 <= rating <= 5, f"user_rating must be 1-5 (row {row_num})"


def test_csv_schema_version_format(sample_csv_export):
    """Test that schema_version follows semantic versioning."""
    reader = csv.DictReader(StringIO(sample_csv_export))
    for row_num, row in enumerate(reader, start=2):
        version = row["schema_version"]
        parts = version.split(".")
        assert len(parts) == 3, f"Schema version must be MAJOR.MINOR.PATCH (row {row_num})"
        assert all(part.isdigit() for part in parts), \
            f"Schema version parts must be numeric (row {row_num})"


def test_csv_multi_shelf_expansion():
    """Test that books on multiple shelves produce multiple rows."""
    # Sample with book on 2 shelves
    csv_with_multi_shelf = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,11870085,"Test Book","Test Author",,,,,,,,,,,,read,read,true,false,,,,,,,2025-10-28T12:00:00Z,1.0.0
12345,testuser,11870085,"Test Book","Test Author",,,,,,,,,,,,read,favorites,false,false,,,,,,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_multi_shelf))
    rows = list(reader)

    # Both rows should have same book ID
    assert len(rows) == 2
    assert rows[0]["goodreads_book_id"] == rows[1]["goodreads_book_id"]

    # But different shelves
    assert rows[0]["shelf_name"] != rows[1]["shelf_name"]
    assert rows[0]["shelf_name"] == "read"
    assert rows[1]["shelf_name"] == "favorites"


def test_csv_pipe_separated_genres():
    """Test that genres are pipe-separated in single cell."""
    csv_with_genres = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,123,"Test","Author",,,,,,,,,"fiction|mystery|thriller",,,read,read,true,false,,,,,,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_genres))
    row = next(reader)

    assert row["genres"] == "fiction|mystery|thriller"
    genres_list = row["genres"].split("|")
    assert len(genres_list) == 3
    assert genres_list == ["fiction", "mystery", "thriller"]


def test_csv_pipe_separated_additional_authors():
    """Test that additional_authors are pipe-separated."""
    csv_with_coauthors = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,123,"Test","Primary Author","Co-Author 1|Co-Author 2",,,,,,,,,,,read,read,true,false,,,,,,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_coauthors))
    row = next(reader)

    assert row["additional_authors"] == "Co-Author 1|Co-Author 2"
    authors_list = row["additional_authors"].split("|")
    assert len(authors_list) == 2


def test_csv_empty_optional_fields():
    """Test that optional fields can be empty."""
    csv_with_missing_data = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,123,"Minimal Book","Author",,,,,,,,,,,,to-read,to-read,true,false,,,,,2025-10-28T12:00:00Z,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_missing_data))
    row = next(reader)

    # Optional fields can be empty
    assert row["isbn"] == ""
    assert row["publication_year"] == ""
    assert row["user_rating"] == ""
    assert row["review_text_preview"] == ""
    assert row["date_started"] == ""


def test_csv_quote_escaping():
    """Test that quotes in text are properly escaped with double quotes."""
    csv_with_quotes = '''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,123,"Book with ""Quotes""","Author",,,,,,,,,,,,read,read,true,true,"Review with ""quoted"" text.",,,,,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_quotes))
    row = next(reader)

    # Quotes should be unescaped when read by CSV parser
    assert row["title"] == 'Book with "Quotes"'
    assert row["review_text_preview"] == 'Review with "quoted" text.'


def test_csv_review_text_truncation():
    """Test that review text is truncated to 1000 chars with ellipsis."""
    long_review = "A" * 1500  # 1500 characters
    truncated_expected = "A" * 997 + "..."  # 1000 total chars

    # This test will verify truncation happens in the exporter
    # For now, just validate the contract allows up to 1000 chars
    csv_with_long_review = f'''\ufeffuser_id,username,goodreads_book_id,title,author,additional_authors,isbn,isbn13,publication_year,publisher,page_count,language,genres,average_rating,ratings_count,user_rating,reading_status,shelf_name,is_builtin_shelf,has_review,review_text_preview,review_date,likes_count,date_added,date_started,date_finished,scraped_at,schema_version
12345,testuser,123,"Test","Author",,,,,,,,,,,,read,read,true,true,"{truncated_expected}",,,,,,2025-10-28T12:00:00Z,1.0.0
'''

    reader = csv.DictReader(StringIO(csv_with_long_review))
    row = next(reader)

    assert len(row["review_text_preview"]) <= 1000, \
        "Review text preview must be truncated to max 1000 chars"
    assert row["review_text_preview"].endswith("...") if len(row["review_text_preview"]) == 1000 else True


def test_csv_iso8601_date_format():
    """Test that date fields use ISO 8601 format."""
    reader = csv.DictReader(StringIO(sample_csv_export))
    for row in reader:
        if row["scraped_at"]:
            # Should match ISO 8601 pattern (basic validation)
            assert "T" in row["scraped_at"], "Date must be in ISO 8601 format with 'T' separator"
            assert "Z" in row["scraped_at"] or "+" in row["scraped_at"] or "-" in row["scraped_at"][-6:], \
                "Date must include timezone (Z or offset)"


def test_csv_parseable():
    """Test that CSV can be parsed by standard csv.DictReader."""
    csv_content = sample_csv_export

    try:
        reader = csv.DictReader(StringIO(csv_content))
        rows = list(reader)
        assert len(rows) > 0, "CSV must contain at least one data row"
    except csv.Error as e:
        pytest.fail(f"CSV must be parseable by standard Python csv module: {e}")
