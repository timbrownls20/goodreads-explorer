"""Main Goodreads scraper orchestrator.

Coordinates HTTP requests, parsing, pagination, rate limiting, and error handling.
Per Constitution Principles: IV (Integration), V (Observability), VI (Validation).
"""

import time
from typing import Callable
import httpx

from parse.src.exceptions import InvalidURLError, NetworkError, PrivateProfileError, RateLimitError
from parse.src.models import Library, UserBookRelation, Book, Shelf, ReadingStatus
from parse.src.parsers import parse_library_page
from parse.src.scrapers.pagination import detect_pagination, get_next_page_url, build_library_url
from parse.src.validators import validate_goodreads_profile_url, extract_user_id_from_url
from parse.src.logging_config import get_logger

logger = get_logger(__name__)


class GoodreadsScraper:
    """Orchestrates scraping of Goodreads library data.

    Handles:
    - URL validation
    - HTTP requests with rate limiting (1 req/sec per FR-008)
    - Retry logic with exponential backoff (per FR-009)
    - Pagination handling (per FR-004)
    - Progress callbacks (per SC-006)
    - Error detection (private profiles, rate limits, network errors)
    """

    def __init__(
        self,
        rate_limit_delay: float = 1.0,
        max_retries: int = 3,
        timeout: int = 30,
        progress_callback: Callable[[int, int, str], None] | None = None
    ):
        """Initialize scraper with configuration.

        Args:
            rate_limit_delay: Delay between requests in seconds (default 1.0)
            max_retries: Maximum retry attempts for failed requests (default 3)
            timeout: Request timeout in seconds (default 30)
            progress_callback: Optional callback for progress updates
                               Signature: callback(current: int, total: int, message: str)
        """
        self.rate_limit_delay = rate_limit_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.progress_callback = progress_callback
        self.last_request_time = 0.0

    def scrape_library(self, profile_url: str) -> Library:
        """Scrape complete library from Goodreads profile.

        Args:
            profile_url: Goodreads profile URL

        Returns:
            Library object with all scraped data

        Raises:
            InvalidURLError: If URL is not a valid Goodreads profile
            PrivateProfileError: If profile is private
            NetworkError: If network requests fail after retries
            RateLimitError: If rate limiting is detected from Goodreads

        Example:
            >>> scraper = GoodreadsScraper()
            >>> library = scraper.scrape_library("https://www.goodreads.com/user/show/12345-username")
            >>> print(f"Found {library.total_books} books")
        """
        # Validate URL
        is_valid, normalized_url, user_id = validate_goodreads_profile_url(profile_url)
        if not is_valid or not user_id:
            raise InvalidURLError(
                url=profile_url,
                message=f"Invalid Goodreads profile URL. Expected format: "
                        f"https://www.goodreads.com/user/show/USER_ID-username"
            )

        logger.info(
            "Starting library scrape",
            user_id=user_id,
            profile_url=normalized_url
        )

        # Scrape all pages
        all_books = []
        page_num = 1
        username = "unknown"

        with httpx.Client(timeout=self.timeout) as client:
            while True:
                # Build library URL for current page
                library_url = build_library_url(normalized_url, page=page_num)

                logger.info(
                    "Fetching library page",
                    page=page_num,
                    url=library_url
                )

                # Fetch page with rate limiting and retries
                html = self._fetch_with_retry(client, library_url)

                # Check for private profile
                if self._is_private_profile(html):
                    raise PrivateProfileError(
                        f"Profile {normalized_url} is private and cannot be scraped"
                    )

                # Parse page
                page_data = parse_library_page(html)

                # Extract username from first page
                if page_num == 1:
                    username = page_data.get('username', 'unknown')

                # Collect books
                books_on_page = page_data.get('books', [])
                all_books.extend(books_on_page)

                logger.info(
                    "Page scraped",
                    page=page_num,
                    books_on_page=len(books_on_page),
                    total_books=len(all_books)
                )

                # Progress callback
                if self.progress_callback:
                    self.progress_callback(
                        len(all_books),
                        len(all_books),  # Total unknown until complete
                        f"Scraped page {page_num}: {len(all_books)} books so far"
                    )

                # Check for next page
                if not page_data.get('has_next_page', False):
                    break

                page_num += 1

        # Convert raw book data to models
        user_books = self._convert_to_models(all_books)

        # Create Library aggregate
        library = Library(
            user_id=user_id,
            username=username,
            profile_url=normalized_url,
            user_books=user_books
        )

        logger.info(
            "Library scrape complete",
            user_id=user_id,
            total_books=library.total_books,
            pages_scraped=page_num
        )

        return library

    def _fetch_with_retry(self, client: httpx.Client, url: str) -> str:
        """Fetch URL with rate limiting and retry logic.

        Args:
            client: HTTP client
            url: URL to fetch

        Returns:
            HTML content

        Raises:
            NetworkError: If all retries exhausted
            RateLimitError: If rate limited by server
        """
        for attempt in range(self.max_retries):
            try:
                # Rate limiting (1 req/sec per FR-008)
                self._enforce_rate_limit()

                # Make request
                response = client.get(url)

                # Check for rate limiting response
                if response.status_code == 429:
                    raise RateLimitError(
                        f"Rate limited by Goodreads. Please slow down requests."
                    )

                response.raise_for_status()
                return response.text

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise InvalidURLError(
                        url=url,
                        message=f"Profile not found (404): {url}"
                    )
                elif e.response.status_code == 429:
                    raise RateLimitError(f"Rate limited by Goodreads")
                elif e.response.status_code >= 500:
                    # Server error - retry with backoff
                    if attempt < self.max_retries - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        logger.warning(
                            "Server error, retrying",
                            attempt=attempt + 1,
                            wait_time=wait_time,
                            status_code=e.response.status_code
                        )
                        time.sleep(wait_time)
                        continue
                    else:
                        raise NetworkError(
                            f"Server error after {self.max_retries} retries: {e}"
                        )
                else:
                    raise NetworkError(f"HTTP error: {e}")

            except (httpx.ConnectError, httpx.TimeoutException) as e:
                # Network error - retry with backoff
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(
                        "Network error, retrying",
                        attempt=attempt + 1,
                        wait_time=wait_time,
                        error=str(e)
                    )
                    time.sleep(wait_time)
                    continue
                else:
                    raise NetworkError(
                        f"Network error after {self.max_retries} retries: {e}"
                    )

        raise NetworkError(f"Failed to fetch {url} after {self.max_retries} attempts")

    def _enforce_rate_limit(self) -> None:
        """Enforce rate limit of 1 request per second per FR-008."""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time

        if time_since_last_request < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last_request
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    def _is_private_profile(self, html: str) -> bool:
        """Detect if profile is private per FR-011.

        Args:
            html: Page HTML content

        Returns:
            True if profile is private, False otherwise
        """
        # Check for common private profile indicators
        private_indicators = [
            "this profile is private",
            "privateProfile",
            "profile-private"
        ]

        html_lower = html.lower()
        return any(indicator in html_lower for indicator in private_indicators)

    def _convert_to_models(self, raw_books: list[dict]) -> list[UserBookRelation]:
        """Convert raw book data to Pydantic models.

        Args:
            raw_books: List of book data dictionaries from parser

        Returns:
            List of UserBookRelation models
        """
        user_books = []

        for raw_book in raw_books:
            try:
                # Create Book model
                book = Book(
                    goodreads_id=raw_book.get('goodreads_id', ''),
                    title=raw_book.get('title', ''),
                    author=raw_book.get('author', ''),
                    goodreads_url=raw_book.get('goodreads_url', 'https://www.goodreads.com')
                )

                # Create Shelf models
                shelf_names = raw_book.get('shelves', ['to-read'])
                shelves = []
                for shelf_name in shelf_names:
                    is_builtin = shelf_name in ['read', 'currently-reading', 'to-read']
                    shelves.append(Shelf(name=shelf_name, is_builtin=is_builtin))

                # Determine reading status
                reading_status_str = raw_book.get('reading_status', 'to-read')
                reading_status = ReadingStatus(reading_status_str)

                # Create UserBookRelation
                user_book = UserBookRelation(
                    book=book,
                    user_rating=raw_book.get('user_rating'),
                    reading_status=reading_status,
                    shelves=shelves,
                    review=None,  # Reviews handled in User Story 3
                    date_added=raw_book.get('date_added'),
                    date_started=None,
                    date_finished=None
                )

                user_books.append(user_book)

            except Exception as e:
                logger.warning(
                    "Failed to convert book to model, skipping",
                    book_title=raw_book.get('title', 'unknown'),
                    error=str(e)
                )
                continue

        return user_books
