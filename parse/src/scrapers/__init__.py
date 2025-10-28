"""Web scraping orchestration for Goodreads.

Exports scraper class and pagination utilities.
Per Constitution Principle IV: Integration testing for external services.
"""

from parse.src.scrapers.goodreads_scraper import GoodreadsScraper
from parse.src.scrapers.pagination import (
    build_library_url,
    detect_pagination,
    extract_page_number,
    get_next_page_url,
)

__all__ = [
    "GoodreadsScraper",
    "detect_pagination",
    "get_next_page_url",
    "extract_page_number",
    "build_library_url",
]
