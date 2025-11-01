"""Main Goodreads scraper orchestrator.

Coordinates HTTP requests, parsing, pagination, rate limiting, and error handling.
Per Constitution Principles: IV (Integration), V (Observability), VI (Validation).
"""

import time
from datetime import datetime
from typing import Callable
from pathlib import Path
import httpx

from src.exceptions import InvalidURLError, NetworkError, PrivateProfileError, RateLimitError
from src.models import Library, UserBookRelation, Book, Shelf, ReadingStatus, ReadRecord
from src.parsers import parse_library_page, parse_review_page_shelves, parse_book_page, parse_reading_status_shelves
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
        sort: str | None = None,
        sort_by: str | None = None,
        save_individual_books: bool = False,
        output_dir: Path | str | None = None,
    ):
        """Initialize scraper with configuration.

        Args:
            rate_limit_delay: Delay between requests in seconds (default 1.0)
            max_retries: Maximum retry attempts for failed requests (default 3)
            timeout: Request timeout in seconds (default 30)
            progress_callback: Optional callback for progress updates
                               Signature: callback(current: int, total: int, message: str)
            limit: Maximum number of books to scrape from each shelf (default None = all books)
            sort: Goodreads sort parameter (e.g., "read_count", "date_read", "date_added", "rating")
            sort_by: CLI sort option (e.g., "random", "none", etc.) - used for client-side sorting
            save_individual_books: If True, save each book to a separate file immediately after parsing
            output_dir: Directory to save individual book files (required if save_individual_books is True)
        """
        self.rate_limit_delay = rate_limit_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.progress_callback = progress_callback
        self.limit = limit
        self.sort = sort
        self.sort_by = sort_by
        self.save_individual_books = save_individual_books
        self.output_dir = Path(output_dir) if output_dir else None
        self.last_request_time = 0.0

        # Create output directory if needed
        if self.save_individual_books and self.output_dir:
            self.output_dir.mkdir(parents=True, exist_ok=True)

    def scrape_library(self, profile_url: str) -> Library:
        """Scrape complete library from Goodreads profile.

        This method now scrapes each reading status shelf separately (to-read,
        currently-reading, read, etc.) and merges the results into a single library.

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
            profile_url=normalized_url
        )

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
            # First, fetch the library page to get the list of reading status shelves
            initial_library_url = build_library_url(normalized_url, page=1, shelf="all", sort=self.sort)
            logger.info("Fetching initial library page to discover shelves", url=initial_library_url)

            initial_html = self._fetch_with_retry(client, initial_library_url)

            # Check for private profile
            if self._is_private_profile(initial_html):
                raise PrivateProfileError(
                    f"Profile {normalized_url} is private and cannot be scraped"
                )

            # Parse the initial page to get username
            initial_page_data = parse_library_page(initial_html)
            parsed_username = initial_page_data.get('username', None)
            if parsed_username and parsed_username != 'unknown':
                username = parsed_username

            # Extract reading status shelves (excluding "All")
            shelves_to_scrape = parse_reading_status_shelves(initial_html)
            shelves_to_scrape = [(slug, count) for slug, count in shelves_to_scrape if slug != "all"]

            logger.info(
                "Discovered reading status shelves",
                shelves=[f"{slug} ({count})" for slug, count in shelves_to_scrape]
            )

            # Track books across shelves to avoid duplicates
            all_books = []
            seen_book_ids = set()
            total_pages_scraped = 0

            # Scrape each shelf separately
            for shelf_slug, shelf_book_count in shelves_to_scrape:
                logger.info(
                    "Starting scrape of shelf",
                    shelf=shelf_slug,
                    expected_books=shelf_book_count,
                    limit_per_shelf=self.limit
                )

                # Map shelf slug to reading status
                reading_status = self._map_shelf_to_reading_status(shelf_slug)

                # Track books from current shelf
                shelf_books = []

                # Scrape all pages of this shelf
                page_num = 1
                while True:
                    # Build library URL for current page and shelf
                    library_url = build_library_url(normalized_url, page=page_num, shelf=shelf_slug, sort=self.sort)

                    logger.info(
                        "Fetching library page",
                        shelf=shelf_slug,
                        page=page_num,
                        url=library_url
                    )

                    # Fetch page with rate limiting and retries
                    html = self._fetch_with_retry(client, library_url)

                    # Parse page
                    page_data = parse_library_page(html)

                    # Collect books
                    books_on_page = page_data.get('books', [])

                    # Set reading status for each book based on the shelf being scraped
                    for book in books_on_page:
                        book['reading_status'] = reading_status

                    # Filter out duplicates (books may appear in multiple shelves)
                    new_books = []
                    for book in books_on_page:
                        book_id = book.get('goodreads_id')
                        if book_id and book_id not in seen_book_ids:
                            new_books.append(book)
                            seen_book_ids.add(book_id)
                            shelf_books.append(book)

                            # Apply per-shelf limit
                            if self.limit is not None and len(shelf_books) >= self.limit:
                                break

                    all_books.extend(new_books)

                    logger.info(
                        "Page scraped",
                        shelf=shelf_slug,
                        page=page_num,
                        books_on_page=len(books_on_page),
                        new_books=len(new_books),
                        shelf_books=len(shelf_books),
                        total_books=len(all_books)
                    )

                    # Progress callback
                    if self.progress_callback:
                        self.progress_callback(
                            len(all_books),
                            len(all_books),
                            f"Scraped shelf '{shelf_slug}' page {page_num}: {len(shelf_books)} from shelf, {len(all_books)} total"
                        )

                    # Check if we've reached the per-shelf limit
                    if self.limit is not None and len(shelf_books) >= self.limit:
                        logger.info(
                            "Reached per-shelf limit",
                            shelf=shelf_slug,
                            limit=self.limit,
                            shelf_books=len(shelf_books)
                        )
                        break

                    # Check for next page
                    if not page_data.get('has_next_page', False):
                        break

                    page_num += 1
                    total_pages_scraped += 1

                logger.info(
                    "Completed scraping shelf",
                    shelf=shelf_slug,
                    books_from_shelf=len(shelf_books)
                )

            logger.info(
                "Completed scraping all shelves",
                total_books=len(all_books),
                shelves_scraped=len(shelves_to_scrape),
                total_pages=total_pages_scraped
            )

            # Fetch complete data from review pages and book pages
            logger.info("Fetching complete data from review and book pages",
                       total_books=len(all_books))

            for i, book_data in enumerate(all_books, 1):
                # Add timestamp for when this book is being scraped
                book_data['scraped_at'] = datetime.now().isoformat()

                # Fetch review page for shelf data
                review_url = book_data.get('review_url')
                review_html = None
                if review_url:
                    try:
                        # Fetch review page
                        review_html = self._fetch_with_retry(client, review_url)

                        # Extract all shelves and dates from review page
                        shelves, reading_status_from_review, dates = parse_review_page_shelves(review_html)

                        # Preserve the shelf-based reading_status (already set based on which shelf we scraped from)
                        # Only use review page reading_status if we don't have one yet
                        if not book_data.get('reading_status'):
                            book_data['reading_status'] = reading_status_from_review

                        # Ensure the reading status shelf is included in the shelves list
                        reading_status = book_data.get('reading_status')
                        if reading_status:
                            # Check if the reading status shelf is already in the list
                            # shelves is a list of shelf name strings at this point
                            if reading_status not in shelves:
                                # Add the reading status as the first shelf
                                shelves.insert(0, reading_status)

                        # Update book data with complete shelf information and dates
                        book_data['shelves'] = shelves
                        book_data['date_added'] = dates.get('date_added')
                        read_records = dates.get('read_records', [])

                        # If book is marked as "read" but has no read records, create one with null dates
                        # This handles cases where a book was marked as read without recording specific dates
                        if reading_status == 'read' and not read_records:
                            read_records = [{'date_started': None, 'date_finished': None}]
                            logger.debug("Created null-date read record for book marked as read",
                                       book_id=book_data.get('goodreads_id'))

                        book_data['read_records'] = read_records

                        # Also extract publisher from review page if present
                        review_metadata = parse_book_page(review_html)
                        if review_metadata.get('publisher'):
                            book_data['publisher'] = review_metadata['publisher']

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
        user_books = self._convert_to_models(all_books, username)

        # Shuffle if random sort was requested
        if self.sort_by == "random":
            import random
            random.shuffle(user_books)
            logger.info("Shuffled books for random sort", total_books=len(user_books))

        # Create Library aggregate
        library = Library(
            user_id=user_id,
            username=username,
            profile_url=normalized_url,
            user_books=user_books
        )

        # Save library metadata if individual book saving is enabled
        if self.save_individual_books and self.output_dir:
            try:
                import json
                metadata = {
                    'user_id': library.user_id,
                    'username': library.username,
                    'profile_url': str(library.profile_url),
                    'total_books': library.total_books,
                    'scraped_at': library.scraped_at.isoformat() if library.scraped_at else None,
                    'schema_version': library.schema_version
                }
                metadata_path = self.output_dir / '_library_metadata.json'
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
                logger.info(
                    "Saved library metadata",
                    metadata_path=str(metadata_path)
                )
            except Exception as e:
                logger.error(
                    "Failed to save library metadata",
                    error=str(e)
                )

        logger.info(
            "Library scrape complete",
            user_id=user_id,
            total_books=library.total_books,
            total_pages_scraped=total_pages_scraped
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

    def _map_shelf_to_reading_status(self, shelf_slug: str) -> str | None:
        """Map a shelf slug to a reading status string.

        Args:
            shelf_slug: Shelf slug (e.g., "to-read", "currently-reading", "read")

        Returns:
            Reading status string or None if not a standard reading status shelf
        """
        mapping = {
            "to-read": "to-read",
            "currently-reading": "currently-reading",
            "read": "read",
            "did-not-finish": "did-not-finish",
            "paused": "paused",
            "reference": "reference",
            "to-read-next": "to-read-next",
            "to-read-owned": "to-read-owned",
        }
        return mapping.get(shelf_slug)

    def _convert_to_models(self, raw_books: list[dict], username: str = None) -> list[UserBookRelation]:
        """Convert raw book data to Pydantic models.

        Args:
            raw_books: List of book data dictionaries from parser
            username: Username for saving individual book files

        Returns:
            List of UserBookRelation models
        """
        user_books = []

        for raw_book in raw_books:
            try:
                # Convert literary_awards dicts to LiteraryAward model instances
                from src.models.book import LiteraryAward
                literary_awards = []
                for award_data in raw_book.get('literary_awards', []):
                    if isinstance(award_data, dict):
                        literary_awards.append(LiteraryAward(**award_data))

                # Create Book model with all available fields
                book = Book(
                    goodreads_id=raw_book.get('goodreads_id', ''),
                    title=raw_book.get('title', ''),
                    author=raw_book.get('author', ''),
                    goodreads_url=raw_book.get('goodreads_url', 'https://www.goodreads.com'),
                    isbn=raw_book.get('isbn'),
                    isbn13=raw_book.get('isbn13'),
                    publication_date=raw_book.get('publication_date'),
                    publisher=raw_book.get('publisher'),
                    page_count=raw_book.get('page_count'),
                    language=raw_book.get('language'),
                    setting=raw_book.get('setting'),
                    literary_awards=literary_awards,
                    genres=raw_book.get('genres', []),
                    average_rating=raw_book.get('average_rating'),
                    ratings_count=raw_book.get('ratings_count'),
                    cover_image_url=raw_book.get('cover_image_url')
                )

                # Create Shelf models
                shelf_names = raw_book.get('shelves', [])
                shelves = []
                # All reading status shelves are considered built-in
                builtin_shelves = [
                    'read', 'currently-reading', 'to-read',
                    'did-not-finish', 'paused', 'reference',
                    'to-read-next', 'to-read-owned'
                ]
                for shelf_name in shelf_names:
                    is_builtin = shelf_name in builtin_shelves
                    shelves.append(Shelf(name=shelf_name, is_builtin=is_builtin))

                # Model requires at least 1 shelf - use 'unknown' as fallback if none found
                if not shelves:
                    shelves = [Shelf(name='unknown', is_builtin=False)]
                    logger.warning("No shelves found for book, using 'unknown' fallback",
                                  book_id=raw_book.get('goodreads_id'))

                # Determine reading status (keep as None if not found)
                reading_status_str = raw_book.get('reading_status')
                reading_status = ReadingStatus(reading_status_str) if reading_status_str else None

                # Parse scraped_at timestamp if present
                scraped_at = None
                if raw_book.get('scraped_at'):
                    try:
                        scraped_at = datetime.fromisoformat(raw_book.get('scraped_at'))
                    except (ValueError, TypeError):
                        pass

                # Create ReadRecord objects from raw read records
                read_records = []
                for record_dict in raw_book.get('read_records', []):
                    read_records.append(ReadRecord(
                        date_started=record_dict.get('date_started'),
                        date_finished=record_dict.get('date_finished')
                    ))

                # Create UserBookRelation
                user_book = UserBookRelation(
                    book=book,
                    user_rating=raw_book.get('user_rating'),
                    reading_status=reading_status,
                    shelves=shelves,
                    review=None,  # Reviews handled in User Story 3
                    date_added=raw_book.get('date_added'),
                    read_records=read_records,
                    scraped_at=scraped_at
                )

                user_books.append(user_book)

                # Save individual book file if requested
                if self.save_individual_books and self.output_dir:
                    try:
                        from src.exporters.json_exporter import export_book_to_file
                        export_book_to_file(user_book, self.output_dir, username)
                        logger.debug(
                            "Saved book to file",
                            goodreads_id=user_book.book.goodreads_id,
                            title=user_book.book.title
                        )
                    except Exception as e:
                        logger.error(
                            "Failed to save book file",
                            goodreads_id=user_book.book.goodreads_id,
                            error=str(e)
                        )

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
