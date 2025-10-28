"""Book entity model for Goodreads library data.

Represents a single book with metadata extracted from Goodreads.
Per Constitution Principle I: Data-First Development with Pydantic validation.
"""

from pydantic import BaseModel, Field, HttpUrl, field_validator
from pydantic_extra_types.isbn import ISBN


class Book(BaseModel):
    """Book entity with core and extended metadata fields.

    Attributes:
        goodreads_id: Unique Goodreads book identifier
        title: Book title (required, max 500 chars)
        author: Primary author name (required, max 200 chars)
        additional_authors: List of co-authors, editors, etc.
        isbn: ISBN-10 or ISBN-13 (validated)
        isbn13: ISBN-13 specifically if different
        publication_year: Year published (1000-2100 range)
        publisher: Publisher name (max 200 chars)
        page_count: Number of pages (must be positive)
        language: Book language (ISO 639-1 code preferred)
        genres: List of genre tags (max 50 genres)
        average_rating: Goodreads community average (0.0-5.0)
        ratings_count: Total number of ratings on Goodreads
        cover_image_url: URL to cover image
        goodreads_url: Canonical Goodreads book page URL
    """

    goodreads_id: str = Field(min_length=1, description="Unique Goodreads book ID")
    title: str = Field(min_length=1, max_length=500, description="Book title")
    author: str = Field(min_length=1, max_length=200, description="Primary author")
    additional_authors: list[str] = Field(
        default_factory=list,
        description="Co-authors, editors, etc."
    )
    isbn: ISBN | None = Field(None, description="ISBN-10 or ISBN-13")
    isbn13: str | None = Field(None, pattern=r'^\d{13}$', description="ISBN-13 format")
    publication_year: int | None = Field(None, ge=1000, le=2100, description="Year published")
    publisher: str | None = Field(None, max_length=200, description="Publisher name")
    page_count: int | None = Field(None, ge=1, description="Number of pages")
    language: str | None = Field(None, description="Book language (ISO 639-1)")
    genres: list[str] = Field(
        default_factory=list,
        max_length=50,
        description="Genre tags/categories"
    )
    average_rating: float | None = Field(None, ge=0.0, le=5.0, description="Goodreads avg rating")
    ratings_count: int | None = Field(None, ge=0, description="Total Goodreads ratings")
    cover_image_url: HttpUrl | None = Field(None, description="Cover image URL")
    goodreads_url: HttpUrl = Field(description="Canonical Goodreads book page")

    @field_validator('title', 'author')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        """Ensure title and author are non-empty after stripping whitespace."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace-only")
        return stripped

    @field_validator('genres')
    @classmethod
    def normalize_genres(cls, v: list[str]) -> list[str]:
        """Normalize genres: lowercase, deduplicate, limit each to 50 chars."""
        if not v:
            return []

        normalized = []
        seen = set()

        for genre in v:
            # Lowercase and trim
            normalized_genre = genre.strip().lower()[:50]
            # Deduplicate
            if normalized_genre and normalized_genre not in seen:
                normalized.append(normalized_genre)
                seen.add(normalized_genre)

        return normalized

    class Config:
        """Pydantic model configuration."""
        str_strip_whitespace = True
        validate_assignment = True
        json_schema_extra = {
            "example": {
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
            }
        }
