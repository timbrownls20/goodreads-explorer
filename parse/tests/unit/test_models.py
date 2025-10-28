"""Unit tests for Pydantic data models.

Tests all models for validation, constraints, and business logic.
Per Constitution Principle III: TDD with comprehensive model testing.
"""

from datetime import datetime
import pytest
from pydantic import ValidationError

from parse.src.models import Book, Library, ReadingStatus, Shelf, Review, UserBookRelation


class TestBook:
    """Tests for Book model validation."""

    def test_book_with_all_fields(self):
        """Test creating a Book with all fields populated."""
        book = Book(
            goodreads_id="11870085",
            title="The Fault in Our Stars",
            author="John Green",
            additional_authors=["Co-Author"],
            isbn=None,
            isbn13="9780525478812",
            publication_year=2012,
            publisher="Dutton Books",
            page_count=313,
            language="en",
            genres=["young adult", "fiction", "romance"],
            average_rating=4.18,
            ratings_count=4500000,
            cover_image_url="https://images.gr-assets.com/books/1360206420l/11870085.jpg",
            goodreads_url="https://www.goodreads.com/book/show/11870085-the-fault-in-our-stars"
        )

        assert book.goodreads_id == "11870085"
        assert book.title == "The Fault in Our Stars"
        assert book.author == "John Green"
        assert book.publication_year == 2012

    def test_book_required_fields_only(self):
        """Test creating a Book with only required fields."""
        book = Book(
            goodreads_id="123",
            title="Minimal Book",
            author="Test Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        assert book.goodreads_id == "123"
        assert book.title == "Minimal Book"
        assert book.author == "Test Author"
        assert book.additional_authors == []
        assert book.genres == []

    def test_book_title_whitespace_stripped(self):
        """Test that title whitespace is stripped."""
        book = Book(
            goodreads_id="123",
            title="  Whitespace Title  ",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        assert book.title == "Whitespace Title"

    def test_book_empty_title_raises_error(self):
        """Test that empty or whitespace-only title raises ValidationError."""
        with pytest.raises(ValidationError):
            Book(
                goodreads_id="123",
                title="   ",
                author="Author",
                goodreads_url="https://www.goodreads.com/book/show/123"
            )

    def test_book_genres_normalized(self):
        """Test that genres are lowercased and deduplicated."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            genres=["Fiction", "MYSTERY", "fiction", "Thriller"],
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        # Should be lowercased and deduplicated
        assert "fiction" in book.genres
        assert "mystery" in book.genres
        assert "thriller" in book.genres
        assert len(book.genres) == 3  # Deduplicated

    def test_book_publication_year_validation(self):
        """Test that publication_year is validated within 1000-2100 range."""
        # Valid year
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            publication_year=2020,
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        assert book.publication_year == 2020

        # Invalid year (too old)
        with pytest.raises(ValidationError):
            Book(
                goodreads_id="123",
                title="Test",
                author="Author",
                publication_year=999,
                goodreads_url="https://www.goodreads.com/book/show/123"
            )

        # Invalid year (too future)
        with pytest.raises(ValidationError):
            Book(
                goodreads_id="123",
                title="Test",
                author="Author",
                publication_year=2101,
                goodreads_url="https://www.goodreads.com/book/show/123"
            )

    def test_book_average_rating_range(self):
        """Test that average_rating is validated within 0.0-5.0 range."""
        # Valid rating
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            average_rating=4.5,
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        assert book.average_rating == 4.5

        # Invalid rating (too high)
        with pytest.raises(ValidationError):
            Book(
                goodreads_id="123",
                title="Test",
                author="Author",
                average_rating=5.1,
                goodreads_url="https://www.goodreads.com/book/show/123"
            )


class TestShelf:
    """Tests for Shelf and ReadingStatus models."""

    def test_reading_status_enum_values(self):
        """Test ReadingStatus enum has correct values."""
        assert ReadingStatus.READ.value == "read"
        assert ReadingStatus.CURRENTLY_READING.value == "currently-reading"
        assert ReadingStatus.TO_READ.value == "to-read"

    def test_shelf_name_normalized(self):
        """Test that shelf names are normalized to lowercase."""
        shelf = Shelf(name="FAVORITES", is_builtin=False)
        assert shelf.name == "favorites"

    def test_shelf_from_reading_status(self):
        """Test creating Shelf from ReadingStatus enum."""
        shelf = Shelf.from_reading_status(ReadingStatus.READ)
        assert shelf.name == "read"
        assert shelf.is_builtin is True

    def test_shelf_builtin_defaults_false(self):
        """Test that is_builtin defaults to False for custom shelves."""
        shelf = Shelf(name="custom-shelf")
        assert shelf.is_builtin is False


class TestReview:
    """Tests for Review model."""

    def test_review_with_all_fields(self):
        """Test creating Review with all fields."""
        review = Review(
            review_text="Great book!",
            review_date=datetime(2024, 3, 15, 10, 30),
            likes_count=5
        )

        assert review.review_text == "Great book!"
        assert review.likes_count == 5

    def test_review_empty_text_allowed(self):
        """Test that empty review text is allowed (rating-only reviews)."""
        review = Review(review_text="")
        assert review.review_text == ""


class TestUserBookRelation:
    """Tests for UserBookRelation model."""

    def test_user_book_relation_valid(self):
        """Test creating valid UserBookRelation."""
        book = Book(
            goodreads_id="123",
            title="Test Book",
            author="Test Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        shelf = Shelf(name="read", is_builtin=True)

        user_book = UserBookRelation(
            book=book,
            user_rating=5,
            reading_status=ReadingStatus.READ,
            shelves=[shelf]
        )

        assert user_book.book.title == "Test Book"
        assert user_book.user_rating == 5
        assert user_book.reading_status == ReadingStatus.READ
        assert len(user_book.shelves) == 1

    def test_user_rating_range_validation(self):
        """Test that user_rating is validated within 1-5 range."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        shelf = Shelf(name="read", is_builtin=True)

        # Valid rating
        user_book = UserBookRelation(
            book=book,
            user_rating=3,
            reading_status=ReadingStatus.READ,
            shelves=[shelf]
        )
        assert user_book.user_rating == 3

        # Invalid rating (too low)
        with pytest.raises(ValidationError):
            UserBookRelation(
                book=book,
                user_rating=0,
                reading_status=ReadingStatus.READ,
                shelves=[shelf]
            )

        # Invalid rating (too high)
        with pytest.raises(ValidationError):
            UserBookRelation(
                book=book,
                user_rating=6,
                reading_status=ReadingStatus.READ,
                shelves=[shelf]
            )

    def test_date_validation_order(self):
        """Test that date_started must be <= date_finished."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        shelf = Shelf(name="read", is_builtin=True)

        # Valid dates (started before finished)
        user_book = UserBookRelation(
            book=book,
            reading_status=ReadingStatus.READ,
            shelves=[shelf],
            date_started=datetime(2024, 1, 1),
            date_finished=datetime(2024, 1, 15)
        )
        assert user_book.date_started < user_book.date_finished

        # Invalid dates (started after finished)
        with pytest.raises(ValidationError):
            UserBookRelation(
                book=book,
                reading_status=ReadingStatus.READ,
                shelves=[shelf],
                date_started=datetime(2024, 1, 15),
                date_finished=datetime(2024, 1, 1)
            )

    def test_shelves_required_min_one(self):
        """Test that at least one shelf is required."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        with pytest.raises(ValidationError):
            UserBookRelation(
                book=book,
                reading_status=ReadingStatus.READ,
                shelves=[]  # Empty shelves not allowed
            )

    def test_shelves_deduplicated(self):
        """Test that duplicate shelves are removed."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )

        user_book = UserBookRelation(
            book=book,
            reading_status=ReadingStatus.READ,
            shelves=[
                Shelf(name="read", is_builtin=True),
                Shelf(name="READ", is_builtin=True),  # Duplicate (case-insensitive)
                Shelf(name="favorites", is_builtin=False)
            ]
        )

        # Should have deduplicated to 2 shelves
        assert len(user_book.shelves) == 2


class TestLibrary:
    """Tests for Library aggregate model."""

    def test_library_creation(self):
        """Test creating a Library with books."""
        book = Book(
            goodreads_id="123",
            title="Test",
            author="Author",
            goodreads_url="https://www.goodreads.com/book/show/123"
        )
        user_book = UserBookRelation(
            book=book,
            reading_status=ReadingStatus.READ,
            shelves=[Shelf(name="read", is_builtin=True)]
        )

        library = Library(
            user_id="12345",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/12345-testuser",
            user_books=[user_book]
        )

        assert library.user_id == "12345"
        assert library.username == "testuser"
        assert library.total_books == 1
        assert library.schema_version == "1.0.0"

    def test_library_empty_books(self):
        """Test creating a Library with no books."""
        library = Library(
            user_id="12345",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/12345-testuser"
        )

        assert library.total_books == 0
        assert library.user_books == []

    def test_library_schema_version_validation(self):
        """Test that schema_version follows semver format."""
        library = Library(
            user_id="12345",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/12345-testuser",
            schema_version="2.1.0"
        )
        assert library.schema_version == "2.1.0"

        # Invalid semver
        with pytest.raises(ValidationError):
            Library(
                user_id="12345",
                username="testuser",
                profile_url="https://www.goodreads.com/user/show/12345-testuser",
                schema_version="1.0"  # Missing patch version
            )

    def test_library_get_books_by_status(self):
        """Test filtering books by reading status."""
        read_book = UserBookRelation(
            book=Book(
                goodreads_id="1",
                title="Read Book",
                author="Author",
                goodreads_url="https://www.goodreads.com/book/show/1"
            ),
            reading_status=ReadingStatus.READ,
            shelves=[Shelf(name="read", is_builtin=True)]
        )

        to_read_book = UserBookRelation(
            book=Book(
                goodreads_id="2",
                title="To Read Book",
                author="Author",
                goodreads_url="https://www.goodreads.com/book/show/2"
            ),
            reading_status=ReadingStatus.TO_READ,
            shelves=[Shelf(name="to-read", is_builtin=True)]
        )

        library = Library(
            user_id="12345",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/12345-testuser",
            user_books=[read_book, to_read_book]
        )

        read_books = library.get_books_by_status("read")
        assert len(read_books) == 1
        assert read_books[0].book.title == "Read Book"

    def test_library_get_books_by_shelf(self):
        """Test filtering books by shelf name."""
        book_with_favorites = UserBookRelation(
            book=Book(
                goodreads_id="1",
                title="Favorite Book",
                author="Author",
                goodreads_url="https://www.goodreads.com/book/show/1"
            ),
            reading_status=ReadingStatus.READ,
            shelves=[
                Shelf(name="read", is_builtin=True),
                Shelf(name="favorites", is_builtin=False)
            ]
        )

        book_without_favorites = UserBookRelation(
            book=Book(
                goodreads_id="2",
                title="Regular Book",
                author="Author",
                goodreads_url="https://www.goodreads.com/book/show/2"
            ),
            reading_status=ReadingStatus.READ,
            shelves=[Shelf(name="read", is_builtin=True)]
        )

        library = Library(
            user_id="12345",
            username="testuser",
            profile_url="https://www.goodreads.com/user/show/12345-testuser",
            user_books=[book_with_favorites, book_without_favorites]
        )

        favorites = library.get_books_by_shelf("favorites")
        assert len(favorites) == 1
        assert favorites[0].book.title == "Favorite Book"
