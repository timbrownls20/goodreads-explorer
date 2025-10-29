"""Library page HTML parser for Goodreads.

Extracts book list and user metadata from Goodreads library pages using BeautifulSoup.
Per Constitution Principle I: Data-First with clear parsing logic.
"""

from bs4 import BeautifulSoup
from datetime import datetime
from typing import Any

from src.models import ReadingStatus, Shelf
from src.validators import parse_iso_date, sanitize_text


def parse_library_page(html: str) -> dict[str, Any]:
    """Parse a Goodreads library page HTML.

    Args:
        html: Raw HTML content from Goodreads library page

    Returns:
        Dictionary containing:
        - user_id: Goodreads user ID
        - username: Goodreads username
        - books: List of book data dictionaries
        - has_next_page: Whether there's a next page

    Example book data structure:
        {
            "goodreads_id": "11870085",
            "title": "The Fault in Our Stars",
            "author": "John Green",
            "user_rating": 5,
            "reading_status": "read",
            "shelves": ["read", "favorites"],
            ...
        }
    """
    soup = BeautifulSoup(html, 'lxml')

    # Extract user metadata
    user_id, username = extract_user_metadata(soup)

    # Extract books from table
    books = extract_books_from_table(soup)

    # Check for pagination
    has_next_page = detect_next_page(soup)

    return {
        "user_id": user_id,
        "username": username,
        "books": books,
        "has_next_page": has_next_page
    }


def extract_user_metadata(soup: BeautifulSoup) -> tuple[str, str]:
    """Extract user ID and username from library page.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Tuple of (user_id, username)
    """
    # Try to extract from profile link or header
    # Common patterns in Goodreads HTML
    user_id = "unknown"
    username = "unknown"

    # Look for user profile link
    profile_link = soup.find('a', class_='userProfileName')
    if profile_link and profile_link.get('href'):
        href = profile_link.get('href', '')
        # Extract from /user/show/USER_ID-username
        if '/user/show/' in href:
            parts = href.split('/user/show/')[-1].split('-')
            if parts:
                user_id = parts[0].split('?')[0]  # Remove query params
        username = profile_link.get_text(strip=True)

    # Fallback: look for any element with user info
    if user_id == "unknown":
        # Try to find user ID in page source
        meta_user = soup.find('meta', {'property': 'og:url'})
        if meta_user and meta_user.get('content'):
            content = meta_user.get('content', '')
            if '/user/show/' in content:
                user_id = content.split('/user/show/')[-1].split('-')[0]
                # Also extract username from URL if not found yet
                if username == "unknown" and '-' in content.split('/user/show/')[-1]:
                    # Extract "tim-brown" from "/user/show/172435467-tim-brown"
                    url_part = content.split('/user/show/')[-1]
                    username = '-'.join(url_part.split('-')[1:]).split('?')[0].split('/')[0]

    # Additional fallback: Try to extract from page title
    if username == "unknown":
        title = soup.find('title')
        if title:
            title_text = title.get_text(strip=True)
            # Title format: "Username's books on Goodreads" or similar
            if "'s books" in title_text or "'s book" in title_text:
                username = title_text.split("'s book")[0].strip()

    return (user_id, username)


def extract_books_from_table(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """Extract book data from library table.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        List of book data dictionaries
    """
    books = []

    # Find book rows (Goodreads uses table rows with class 'bookalike')
    book_rows = soup.find_all('tr', class_='bookalike review')

    for row in book_rows:
        try:
            book_data = parse_book_row(row)
            if book_data:
                books.append(book_data)
        except Exception:
            # Skip malformed rows per FR-013
            continue

    return books


def parse_book_row(row: BeautifulSoup) -> dict[str, Any] | None:
    """Parse a single book row from library table.

    Args:
        row: BeautifulSoup element for book row

    Returns:
        Dictionary of book data or None if row is invalid
    """
    book_data = {}

    # Extract title and book ID
    title_cell = row.find('td', class_='field title')
    if title_cell:
        title_link = title_cell.find('a', href=True)
        if title_link:
            href = title_link.get('href', '')
            # Extract book ID from /book/show/BOOK_ID
            if '/book/show/' in href:
                book_id = href.split('/book/show/')[-1].split('-')[0].split('?')[0]
                book_data['goodreads_id'] = book_id
                book_data['goodreads_url'] = f"https://www.goodreads.com{href}"

            book_data['title'] = sanitize_text(title_link.get_text(strip=True))

    # Extract author
    author_cell = row.find('td', class_='field author')
    if author_cell:
        author_link = author_cell.find('a')
        if author_link:
            book_data['author'] = sanitize_text(author_link.get_text(strip=True))

    # Extract user rating
    rating_cell = row.find('td', class_='field rating')
    if rating_cell:
        rating = extract_rating_from_cell(rating_cell)
        book_data['user_rating'] = rating

    # Extract view link from actions cell for fetching complete shelf data
    actions_cell = row.find('td', class_='field actions')
    if actions_cell:
        view_link = actions_cell.find('a', href=True)
        if view_link:
            href = view_link.get('href', '')
            if '/review/show/' in href:
                book_data['review_url'] = f"https://www.goodreads.com{href}"

    # Extract shelf/reading status (basic extraction from table)
    # Note: This will be overridden by complete shelf data from review page
    shelf_cell = row.find('td', class_='field shelf') or row.find('td', class_='field shelves')
    if shelf_cell:
        shelves, reading_status = extract_shelves_from_cell(shelf_cell)
        book_data['shelves'] = shelves
        book_data['reading_status'] = reading_status

    # Extract date added
    date_cell = row.find('td', class_='field date_added')
    if date_cell:
        date_text = date_cell.get_text(strip=True)
        book_data['date_added'] = parse_iso_date(date_text)

    # Only return if we have minimum required fields
    if 'title' in book_data and 'author' in book_data:
        return book_data

    return None


def extract_rating_from_cell(cell: BeautifulSoup) -> int | None:
    """Extract user rating from rating cell.

    Args:
        cell: BeautifulSoup element for rating cell

    Returns:
        Rating (1-5) or None if no rating
    """
    # Look for star rating indicator
    stars = cell.find('span', class_='staticStars')
    if stars:
        # Try to extract from title or text
        title = stars.get('title', '')
        text = stars.get_text(strip=True)

        # Pattern: "5 of 5 stars" or "rated it 5 stars"
        for content in [title, text]:
            if 'of 5 stars' in content.lower():
                try:
                    rating_str = content.split('of 5')[0].strip().split()[-1]
                    rating = int(rating_str)
                    if 1 <= rating <= 5:
                        return rating
                except (ValueError, IndexError):
                    continue

    return None


def extract_shelves_from_cell(cell: BeautifulSoup) -> tuple[list[str], str]:
    """Extract shelf names and reading status from shelf cell.

    Args:
        cell: BeautifulSoup element for shelf cell

    Returns:
        Tuple of (shelf_names_list, reading_status)
    """
    from src.logging_config import get_logger
    logger = get_logger(__name__)

    shelves = []
    reading_status = None  # No default - keep null if unknown

    # Find all shelf links - but filter out rating stars and other non-shelf links
    all_links = cell.find_all('a', href=True)
    shelf_links = []

    for link in all_links:
        href = link.get('href', '')
        text = link.get_text(strip=True).lower()

        # Skip rating stars links (href='#' or contain 'of 5 stars')
        if href == '#' or 'of 5 stars' in text or 'star' in text:
            continue

        # Skip login/signup links
        if '/user/new' in href or '/user/sign_in' in href:
            continue

        # Valid shelf links should have 'shelf=' in href or be shelf names
        if 'shelf=' in href or text in ['read', 'currently-reading', 'to-read']:
            shelf_links.append(link)

    # Extract shelf names from valid links
    if shelf_links:
        for link in shelf_links:
            shelf_name = link.get_text(strip=True).lower()
            if shelf_name:
                shelves.append(shelf_name)

                # Determine reading status from built-in shelves
                if shelf_name == 'read':
                    reading_status = ReadingStatus.READ.value
                elif shelf_name == 'currently-reading':
                    reading_status = ReadingStatus.CURRENTLY_READING.value
                elif shelf_name == 'to-read':
                    reading_status = ReadingStatus.TO_READ.value
    else:
        # No valid shelf links found - try alternative extraction
        logger.debug("No shelf links found with valid hrefs",
                    cell_html=str(cell)[:200])

    # If no shelves found, log warning but don't default
    if not shelves:
        logger.debug("No shelves extracted from table cell")
    else:
        logger.debug("Extracted shelves", shelves=shelves, reading_status=reading_status)

    return (shelves, reading_status)


def detect_next_page(soup: BeautifulSoup) -> bool:
    """Detect if there's a next page of results.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        True if next page exists, False otherwise
    """
    # Look for pagination controls
    pagination = soup.find('div', id='reviewPagination')
    if pagination:
        next_link = pagination.find('a', string=lambda s: s and 'next' in s.lower())
        if next_link and next_link.get('href'):
            return True

    return False


def get_next_page_url(soup: BeautifulSoup, current_url: str) -> str | None:
    """Extract next page URL from pagination controls.

    Args:
        soup: BeautifulSoup parsed HTML
        current_url: Current page URL (for building absolute URL)

    Returns:
        Next page URL or None if no next page
    """
    pagination = soup.find('div', id='reviewPagination')
    if pagination:
        next_link = pagination.find('a', string=lambda s: s and 'next' in s.lower())
        if next_link and next_link.get('href'):
            href = next_link.get('href')
            # Build absolute URL
            if href.startswith('http'):
                return href
            else:
                # Relative URL - append to base
                base_url = current_url.split('?')[0]
                return f"{base_url}{href}"

    return None


def parse_review_page_shelves(html: str) -> tuple[list[str], str, dict]:
    """Parse a Goodreads review page to extract shelves and dates.

    Args:
        html: Raw HTML content from Goodreads review/view page

    Returns:
        Tuple of (shelf_names_list, reading_status, dates_dict)
        where dates_dict contains: date_added, date_started, date_finished
    """
    from src.logging_config import get_logger
    logger = get_logger(__name__)

    soup = BeautifulSoup(html, 'lxml')
    shelves = []
    reading_status = None  # No default - keep null if unknown
    dates = {
        'date_added': None,
        'date_started': None,
        'date_finished': None
    }

    # Find the "bookshelves:" section
    bookshelves_label = soup.find('span', class_='userReview', string=lambda s: s and 'bookshelves:' in s.lower() if s else False)

    if bookshelves_label:
        # Get parent container and find all shelf links after the label
        parent = bookshelves_label.parent
        shelf_links = parent.find_all('a', class_='actionLinkLite', href=lambda h: h and 'shelf=' in h)

        for link in shelf_links:
            shelf_name = link.get_text(strip=True).lower()
            if shelf_name:
                shelves.append(shelf_name)

                # Determine reading status from built-in shelves
                if shelf_name == 'read':
                    reading_status = ReadingStatus.READ.value
                elif shelf_name == 'currently-reading':
                    reading_status = ReadingStatus.CURRENTLY_READING.value
                elif shelf_name == 'to-read':
                    reading_status = ReadingStatus.TO_READ.value

        logger.debug("Extracted shelves from review page",
                    shelves=shelves,
                    reading_status=reading_status)
    else:
        # Fallback: try to extract from JavaScript googletag
        import re
        import json
        pattern = r'googletag\.pubads\(\)\.setTargeting\("shelf",\s*(\[.*?\])\)'
        match = re.search(pattern, html)

        if match:
            try:
                shelf_json = match.group(1)
                shelves = json.loads(shelf_json)

                # Normalize shelf names (googletag uses concatenated names)
                normalized_shelves = []
                for shelf in shelves:
                    # Convert "toread" -> "to-read", "currentlyreading" -> "currently-reading"
                    if shelf == 'toread':
                        normalized_shelves.append('to-read')
                        if reading_status is None:
                            reading_status = ReadingStatus.TO_READ.value
                    elif shelf == 'currentlyreading':
                        normalized_shelves.append('currently-reading')
                        reading_status = ReadingStatus.CURRENTLY_READING.value
                    else:
                        normalized_shelves.append(shelf)

                    # Check for read status
                    if shelf == 'read':
                        reading_status = ReadingStatus.READ.value

                shelves = normalized_shelves
                logger.debug("Extracted shelves from JavaScript",
                            shelves=shelves,
                            reading_status=reading_status)
            except (json.JSONDecodeError, AttributeError) as e:
                logger.warning("Failed to parse shelf JSON from JavaScript", error=str(e))

    # If no shelves found, log warning but don't default
    if not shelves:
        logger.debug("No shelves extracted from review page")

    # Extract dates from Reading Progress section
    import re
    from datetime import datetime

    reading_timeline = soup.find('div', class_='readingTimeline')
    if reading_timeline:
        rows = reading_timeline.find_all('div', class_='readingTimeline__row')

        for i, row in enumerate(rows):
            text_div = row.find('div', class_='readingTimeline__text')
            if text_div:
                text = text_div.get_text(separator=' ', strip=True)

                # Parse date at start of text (e.g., 'April 29, 2025' or 'April  1, 2025')
                date_match = re.match(r'([A-Za-z]+\s+\d+,\s+\d{4})', text)
                if date_match:
                    date_str = date_match.group(1)

                    try:
                        # Parse the date string to ISO format
                        parsed_date = datetime.strptime(date_str, '%B %d, %Y')
                        iso_date = parsed_date.isoformat()

                        # First "Shelved" event with a date is date_added
                        if 'Shelved' in text and not dates['date_added']:
                            dates['date_added'] = iso_date

                        # Look for Started Reading
                        if 'Started Reading' in text and not dates['date_started']:
                            dates['date_started'] = iso_date

                        # Look for Finished Reading
                        if 'Finished Reading' in text and not dates['date_finished']:
                            dates['date_finished'] = iso_date

                    except ValueError as e:
                        logger.debug(f"Failed to parse date: {date_str}", error=str(e))

        if any(dates.values()):
            logger.debug("Extracted dates from reading timeline",
                        date_added=dates['date_added'],
                        date_started=dates['date_started'],
                        date_finished=dates['date_finished'])

    return (shelves, reading_status, dates)
