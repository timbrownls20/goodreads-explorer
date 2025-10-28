"""Library page HTML parser for Goodreads.

Extracts book list and user metadata from Goodreads library pages using BeautifulSoup.
Per Constitution Principle I: Data-First with clear parsing logic.
"""

from bs4 import BeautifulSoup
from datetime import datetime
from typing import Any

from parse.src.models import ReadingStatus, Shelf
from parse.src.validators import parse_iso_date, sanitize_text


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

    # Extract shelf/reading status
    shelf_cell = row.find('td', class_='field shelf')
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
    shelves = []
    reading_status = ReadingStatus.TO_READ.value  # Default

    # Find all shelf links
    shelf_links = cell.find_all('a', href=True)

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

    # If no shelves found, default to to-read
    if not shelves:
        shelves = ['to-read']

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
