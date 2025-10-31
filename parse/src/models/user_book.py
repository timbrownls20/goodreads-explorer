"""UserBookRelation model for Goodreads library data.

Represents the relationship between a user and a book, capturing user-specific data
like ratings, reading status, shelves, reviews, and reading dates.
Per Constitution Principle I: Data-First Development with validation.
"""

from datetime import datetime
from pydantic import BaseModel, Field, model_validator

from src.models.book import Book
from src.models.shelf import ReadingStatus, Shelf


class ReadRecord(BaseModel):
    """A single instance of reading a book.

    Captures one complete read-through of a book with start and finish dates.
    A book can have multiple ReadRecords if read multiple times.

    Attributes:
        date_started: When this reading started (optional)
        date_finished: When this reading finished (optional)
    """

    date_started: datetime | None = Field(None, description="Date started this read")
    date_finished: datetime | None = Field(None, description="Date finished this read")

    @model_validator(mode='after')
    def validate_dates(self) -> 'ReadRecord':
        """Validate that date_started <= date_finished if both exist.

        Returns:
            Self for method chaining

        Raises:
            ValueError: If date_started > date_finished
        """
        if self.date_started and self.date_finished:
            if self.date_started > self.date_finished:
                raise ValueError(
                    f"date_started ({self.date_started}) cannot be after "
                    f"date_finished ({self.date_finished})"
                )
        return self

    class Config:
        """Pydantic model configuration."""
        json_schema_extra = {
            "example": {
                "date_started": "2024-03-10T09:00:00Z",
                "date_finished": "2024-03-14T22:00:00Z"
            }
        }


class Review(BaseModel):
    """User's review of a book.

    Attributes:
        review_text: Full review text (can be empty for rating-only reviews)
        review_date: When review was posted
        likes_count: Number of likes on the review
    """

    review_text: str = Field(max_length=50000, description="Review text content")
    review_date: datetime | None = Field(None, description="Review posted date")
    likes_count: int | None = Field(None, ge=0, description="Number of likes")

    class Config:
        """Pydantic model configuration."""
        json_schema_extra = {
            "example": {
                "review_text": "Absolutely beautiful story about love and loss.",
                "review_date": "2024-03-15T10:30:00Z",
                "likes_count": 5
            }
        }


class UserBookRelation(BaseModel):
    """Relationship between a user and a book with user-specific data.

    Captures all user-specific information about a book: their rating, reading status,
    shelf assignments, review, and reading timeline.

    Attributes:
        book: The Book object being referenced
        user_rating: User's 1-5 star rating (optional)
        reading_status: Current reading status (read/currently-reading/to-read)
        shelves: List of shelves this book is on (min 1 shelf required)
        review: User's review (optional)
        date_added: When book was added to library
        read_records: List of read instances (empty list if not read, can have multiple for re-reads)
    """

    book: Book = Field(description="The book entity")
    user_rating: int | None = Field(None, ge=1, le=5, description="User's 1-5 star rating")
    reading_status: ReadingStatus | None = Field(None, description="Current reading status")
    shelves: list[Shelf] = Field(min_length=1, max_length=100, description="Shelves this book is on")
    review: Review | None = Field(None, description="User's review if exists")
    date_added: datetime | None = Field(None, description="Date added to library")
    read_records: list[ReadRecord] = Field(default_factory=list, description="List of read instances (can be multiple for re-reads)")
    scraped_at: datetime | None = Field(None, description="Timestamp when book data was scraped")

    @model_validator(mode='after')
    def validate_dates(self) -> 'UserBookRelation':
        """Validate date ordering constraints.

        Rules:
        - Each ReadRecord validates its own date_started <= date_finished
        - date_added should be <= first read start date (soft warning, not enforced)

        Returns:
            Self for method chaining
        """
        # Date validation for individual read records is handled by ReadRecord model
        # Soft validation for date_added vs read records will be handled by logging in the scraper
        return self

    @model_validator(mode='after')
    def deduplicate_shelves(self) -> 'UserBookRelation':
        """Deduplicate shelves by name (case-insensitive).

        Returns:
            Self with deduplicated shelves

        Raises:
            ValueError: If deduplication results in no shelves (shouldn't happen)
        """
        if not self.shelves:
            return self

        seen_names = set()
        unique_shelves = []

        for shelf in self.shelves:
            shelf_name_lower = shelf.name.lower()
            if shelf_name_lower not in seen_names:
                unique_shelves.append(shelf)
                seen_names.add(shelf_name_lower)

        # Ensure we still have at least one shelf after deduplication
        if not unique_shelves:
            raise ValueError("Book must have at least one shelf after deduplication")

        # Use object.__setattr__ to avoid triggering validation during assignment
        object.__setattr__(self, 'shelves', unique_shelves)
        return self

    class Config:
        """Pydantic model configuration."""
        validate_assignment = True
        json_schema_extra = {
            "example": {
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
                    "review_text": "Absolutely beautiful story.",
                    "review_date": "2024-03-15T10:30:00Z",
                    "likes_count": 5
                },
                "date_added": "2024-03-01T12:00:00Z",
                "read_records": [
                    {
                        "date_started": "2024-03-10T09:00:00Z",
                        "date_finished": "2024-03-14T22:00:00Z"
                    }
                ]
            }
        }
