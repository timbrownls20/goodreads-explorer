"""HTML parsing utilities for Goodreads pages.

Exports library and book page parsers.
Per Constitution Principle I: Data-First with clean parsing interfaces.
"""

from src.parsers.book_parser import parse_book_page
from src.parsers.library_parser import (
    detect_next_page,
    extract_books_from_table,
    extract_user_metadata,
    get_next_page_url,
    parse_library_page,
)

__all__ = [
    "parse_library_page",
    "extract_user_metadata",
    "extract_books_from_table",
    "detect_next_page",
    "get_next_page_url",
    "parse_book_page",
]
