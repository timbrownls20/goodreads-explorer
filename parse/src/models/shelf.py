"""Shelf and ReadingStatus models for Goodreads library data.

Represents book categorization (built-in reading statuses + custom shelves).
Per Constitution Principle I: Data-First Development with clear enum definitions.
"""

from enum import Enum
from pydantic import BaseModel, Field, field_validator


class ReadingStatus(str, Enum):
    """Goodreads reading status enum.

    These correspond to the reading status shelves on Goodreads:
    - READ: Book has been finished
    - CURRENTLY_READING: Book is being read now
    - TO_READ: Book is on the to-read list
    - DID_NOT_FINISH: Book was started but not completed
    - PAUSED: Book reading is temporarily paused
    - REFERENCE: Book is used as reference material
    - TO_READ_NEXT: Book is queued to read next
    - TO_READ_OWNED: Book is owned and to be read
    """

    READ = "read"
    CURRENTLY_READING = "currently-reading"
    TO_READ = "to-read"
    DID_NOT_FINISH = "did-not-finish"
    PAUSED = "paused"
    REFERENCE = "reference"
    TO_READ_NEXT = "to-read-next"
    TO_READ_OWNED = "to-read-owned"


class Shelf(BaseModel):
    """Shelf entity representing book categorization.

    Can be either a built-in shelf (read/currently-reading/to-read)
    or a custom user-defined shelf (favorites, owned, wishlist, etc.).

    Attributes:
        name: Shelf name (normalized to lowercase)
        is_builtin: Whether this is a Goodreads built-in shelf
        book_count: Number of books on this shelf (if available)
    """

    name: str = Field(min_length=1, max_length=200, description="Shelf name")
    is_builtin: bool = Field(default=False, description="Is Goodreads built-in shelf")
    book_count: int | None = Field(None, ge=0, description="Number of books on shelf")

    @field_validator('name')
    @classmethod
    def normalize_name(cls, v: str) -> str:
        """Normalize shelf name to lowercase and trim whitespace."""
        return v.strip().lower()

    @classmethod
    def from_reading_status(cls, status: ReadingStatus) -> "Shelf":
        """Create a Shelf from a ReadingStatus enum.

        Args:
            status: ReadingStatus enum value

        Returns:
            Shelf object with is_builtin=True
        """
        return cls(name=status.value, is_builtin=True)

    class Config:
        """Pydantic model configuration."""
        str_strip_whitespace = True
        validate_assignment = True
        json_schema_extra = {
            "examples": [
                {
                    "name": "read",
                    "is_builtin": True,
                    "book_count": None
                },
                {
                    "name": "favorites",
                    "is_builtin": False,
                    "book_count": 42
                }
            ]
        }
