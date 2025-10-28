"""Main Goodreads scraper orchestrator.

Coordinates HTTP requests, parsing, pagination, rate limiting, and error handling.
Per Constitution Principles: IV (Integration), V (Observability), VI (Validation).
"""

import time
from datetime import datetime
from typing import Callable
import httpx

from src.exceptions import InvalidURLError, NetworkError, PrivateProfileError, RateLimitError
from src.models import Library, UserBookRelation, Book, Shelf, ReadingStatus
from src.parsers import parse_library_page, parse_review_page_shelves, parse_book_page
from src.scrapers.pagination import detect_pagination, get_next_page_url, build_library_url
from src.validators import validate_goodreads_profile_url, extract_user_id_from_url
from src.logging_config import get_logger

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
        progress_callback: Callable[[int, int, str], None] | None = None,
        limit: int | None = None,
        shelf: str = "all",
    ):
        """Initialize scraper with configuration.

        Args:
            rate_limit_delay: Delay between requests in seconds (default 1.0)
            max_retries: Maximum retry attempts for failed requests (default 3)
            timeout: Request timeout in seconds (default 30)
            progress_callback: Optional callback for progress updates
                               Signature: callback(current: int, total: int, message: str)
            limit: Maximum number of books to scrape (default None = all books)
            shelf: Shelf to scrape (default "all")
        """
        self.rate_limit_delay = rate_limit_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.progress_callback = progress_callback
        self.limit = limit
        self.shelf = shelf
        self.last_request_time = 0.0

    def scrape_library(self, profile_url: str) -> Library:
        """Scrape complete library from Goodreads profile.

        Note: To get complete shelf information for each book, this method fetches
        the review/view page for each book, which contains all shelves.

        Args:
            profile_url: Goodreads profile URL

        Returns:
            Library object with all scraped data and complete shelf information

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
            profile_url=normalized_url,
            shelf=self.shelf
        )

        # Scrape library pages
        all_books = []
        page_num = 1
        # Extract username from URL as fallback
        username = "unknown"
        if '-' in normalized_url:
            # Extract "tim-brown" from "https://www.goodreads.com/user/show/172435467-tim-brown"
            url_username = normalized_url.split('/user/show/')[-1]
            if '-' in url_username:
                username = '-'.join(url_username.split('-')[1:]).split('?')[0].split('/')[0]

        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        with httpx.Client(timeout=self.timeout, headers=headers) as client:
            while True:
                # Build library URL for current page
                library_url = build_library_url(normalized_url, page=page_num, shelf=self.shelf)

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

                # Extract username from first page (if parser found it, override URL-based username)
                if page_num == 1:
                    parsed_username = page_data.get('username', None)
                    if parsed_username and parsed_username != 'unknown':
                        username = parsed_username

                # Collect books
                books_on_page = page_data.get('books', [])

                # Apply limit if specified
                if self.limit is not None:
                    remaining = self.limit - len(all_books)
                    if remaining <= 0:
                        break
                    books_on_page = books_on_page[:remaining]

                all_books.extend(books_on_page)

                logger.info(
                    "Page scraped",
                    page=page_num,
                    books_on_page=len(books_on_page),
                    total_books=len(all_books),
                    limit=self.limit
                )

                # Progress callback
                if self.progress_callback:
                    self.progress_callback(
                        len(all_books),
                        self.limit or len(all_books),  # Use limit as total if set
                        f"Scraped page {page_num}: {len(all_books)} books so far" +
                        (f" (limit: {self.limit})" if self.limit else "")
                    )

                # Check if we've reached the limit
                if self.limit is not None and len(all_books) >= self.limit:
                    logger.info("Reached limit", limit=self.limit, books_scraped=len(all_books))
                    break

                # Check for next page
                if not page_data.get('has_next_page', False):
                    break

                page_num += 1

            # Fetch complete data from review pages and book pages
            logger.info("Fetching complete data from review and book pages",
                       total_books=len(all_books))

            for i, book_data in enumerate(all_books, 1):
                # Fetch review page for shelf data
                review_url = book_data.get('review_url')
                if review_url:
                    try:
                        # Fetch review page
                        review_html = self._fetch_with_retry(client, review_url)

                        # Extract all shelves from review page
                        shelves, reading_status = parse_review_page_shelves(review_html)

                        # Update book data with complete shelf information
                        book_data['shelves'] = shelves
                        book_data['reading_status'] = reading_status

                    except Exception as e:
                        logger.warning("Failed to fetch shelf data for book",
                                      book_id=book_data.get('goodreads_id'),
                                      review_url=review_url,
                                      error=str(e))
                        # Keep the basic shelf data from the library page
                        pass

                # Fetch book page for detailed metadata
                book_url = book_data.get('goodreads_url')
                logger.debug("Checking book URL", book_url=book_url)
                if book_url:
                    try:
                        logger.debug("Fetching book page", book_url=book_url)
                        # Fetch book page
                        book_html = self._fetch_with_retry(client, book_url)

                        # Extract detailed metadata
                        detailed_data = parse_book_page(book_html)
                        logger.debug("Parsed book metadata", detailed_data=detailed_data)

                        # Update book data with detailed information
                        # Only update if the field is not already set
                        for key, value in detailed_data.items():
                            if value is not None:
                                book_data[key] = value
                                logger.debug("Updated book_data field", key=key, value=str(value)[:50])

                    except Exception as e:
                        logger.warning("Failed to fetch book metadata",
                                      book_id=book_data.get('goodreads_id'),
                                      book_url=book_url,
                                      error=str(e))
                        # Keep the basic data from the library page
                        pass
                else:
                    logger.warning("No book URL found for book", book_id=book_data.get('goodreads_id'))

                if i % 10 == 0:
                    logger.info("Fetched complete data",
                               books_processed=i,
                               total_books=len(all_books))

                # Progress callback
                if self.progress_callback:
                    self.progress_callback(
                        i,
                        len(all_books),
                        f"Fetching complete data: {i}/{len(all_books)} books"
                    )

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
                # Create Book model with all available fields
                book = Book(
                    goodreads_id=raw_book.get('goodreads_id', ''),
                    title=raw_book.get('title', ''),
                    author=raw_book.get('author', ''),
                    goodreads_url=raw_book.get('goodreads_url', 'https://www.goodreads.com'),
                    isbn=raw_book.get('isbn'),
                    isbn13=raw_book.get('isbn13'),
                    publication_year=raw_book.get('publication_year'),
                    publisher=raw_book.get('publisher'),
                    page_count=raw_book.get('page_count'),
                    language=raw_book.get('language'),
                    genres=raw_book.get('genres', []),
                    average_rating=raw_book.get('average_rating'),
                    ratings_count=raw_book.get('ratings_count'),
                    cover_image_url=raw_book.get('cover_image_url')
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
                    error=str(e),
                    error_type=type(e).__name__,
                    exc_info=True  # Include full traceback
                )
                continue

        return user_books
