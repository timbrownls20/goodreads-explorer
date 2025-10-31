"""Library aggregate model for Goodreads library data.

Represents the complete collection of books for a Goodreads user.
Per Constitution Principle I: Data-First Development.
"""

from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, field_validator

from src.models.user_book import UserBookRelation


class Library(BaseModel):
    """Library aggregate containing all books for a Goodreads user.

    This is the root aggregate that contains all scraped data for a user's
    Goodreads library, including metadata about the user and collection time.

    Attributes:
        user_id: Goodreads user ID
        username: Goodreads username
        profile_url: Full Goodreads profile URL
        user_books: List of user-book relationships (all books in library)
        scraped_at: Timestamp when data was scraped (UTC)
        schema_version: Schema version for export compatibility (semver)
    """

    user_id: str = Field(min_length=1, description="Goodreads user ID")
    username: str = Field(min_length=1, description="Goodreads username")
    profile_url: HttpUrl = Field(description="Goodreads profile URL")
    user_books: list[UserBookRelation] = Field(
        default_factory=list,
        description="All books in user's library"
    )
    scraped_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="When library was scraped (UTC)"
    )
    schema_version: str = Field(
        default="1.0.0",
        pattern=r'^\d+\.\d+\.\d+$',
        description="Schema version (semver format)"
    )

    @field_validator('schema_version')
    @classmethod
    def validate_semver(cls, v: str) -> str:
        """Validate semantic versioning format.

        Args:
            v: Version string to validate

        Returns:
            Validated version string

        Raises:
            ValueError: If version doesn't match semver format
        """
        parts = v.split('.')
        if len(parts) != 3:
            raise ValueError(f"Schema version must be MAJOR.MINOR.PATCH format, got: {v}")

        if not all(part.isdigit() for part in parts):
            raise ValueError(f"Schema version parts must be numeric, got: {v}")

        return v

    @property
    def total_books(self) -> int:
        """Total number of books in library.

        Returns:
            Count of books in user_books list
        """
        return len(self.user_books)

    def get_books_by_status(self, status: str) -> list[UserBookRelation]:
        """Get all books with a specific reading status.

        Args:
            status: Reading status to filter by (read, currently-reading, to-read)

        Returns:
            List of UserBookRelation objects matching the status
        """
        return [ub for ub in self.user_books if ub.reading_status.value == status]

    def get_books_by_shelf(self, shelf_name: str) -> list[UserBookRelation]:
        """Get all books on a specific shelf.

        Args:
            shelf_name: Name of shelf to filter by (case-insensitive)

        Returns:
            List of UserBookRelation objects on the specified shelf
        """
        shelf_lower = shelf_name.lower()
        return [
            ub for ub in self.user_books
            if any(shelf.name.lower() == shelf_lower for shelf in ub.shelves)
        ]

    def get_books_with_rating(self, min_rating: int = 1) -> list[UserBookRelation]:
        """Get all books with a user rating >= min_rating.

        Args:
            min_rating: Minimum rating threshold (1-5)

        Returns:
            List of UserBookRelation objects with ratings >= min_rating
        """
        return [
            ub for ub in self.user_books
            if ub.user_rating is not None and ub.user_rating >= min_rating
        ]

    def get_books_with_reviews(self) -> list[UserBookRelation]:
        """Get all books that have user reviews.

        Returns:
            List of UserBookRelation objects with non-None review
        """
        return [ub for ub in self.user_books if ub.review is not None]

    class Config:
        """Pydantic model configuration."""
        validate_assignment = True
        json_schema_extra = {
            "example": {
                "user_id": "12345",
                "username": "testuser",
                "profile_url": "https://www.goodreads.com/user/show/12345-testuser",
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
                            {"name": "read", "is_builtin": True, "book_count": None}
                        ],
                        "review": None,
                        "date_added": "2024-03-01T12:00:00Z",
                        "read_records": []
                    }
                ],
                "scraped_at": "2025-10-28T12:00:00Z",
                "schema_version": "1.0.0"
            }
        }
