"""Pagination handling for multi-page Goodreads libraries.

Detects and navigates through paginated library results per FR-004.
Per Constitution Principle I: Clean pagination logic.
"""

from bs4 import BeautifulSoup
from urllib.parse import urljoin


def detect_pagination(html: str) -> bool:
    """Detect if library page has more pages.

    Args:
        html: Raw HTML content from library page

    Returns:
        True if next page exists, False otherwise

    Examples:
        >>> html_with_next = '<div id="reviewPagination"><a href="?page=2">Next</a></div>'
        >>> detect_pagination(html_with_next)
        True
    """
    soup = BeautifulSoup(html, 'lxml')

    # Look for pagination controls
    pagination = soup.find('div', id='reviewPagination')
    if not pagination:
        return False

    # Check for "Next" link
    next_link = pagination.find('a', string=lambda s: s and 'next' in s.lower())
    return next_link is not None and next_link.get('href') is not None


def get_next_page_url(html: str, base_url: str) -> str | None:
    """Extract next page URL from pagination controls.

    Args:
        html: Raw HTML content from library page
        base_url: Base URL for building absolute URLs

    Returns:
        Absolute URL to next page, or None if no next page

    Examples:
        >>> html = '<div id="reviewPagination"><a href="?page=2">Next</a></div>'
        >>> get_next_page_url(html, "https://www.goodreads.com/review/list/12345")
        'https://www.goodreads.com/review/list/12345?page=2'
    """
    soup = BeautifulSoup(html, 'lxml')

    pagination = soup.find('div', id='reviewPagination')
    if not pagination:
        return None

    next_link = pagination.find('a', string=lambda s: s and 'next' in s.lower())
    if not next_link:
        return None

    href = next_link.get('href')
    if not href:
        return None

    # Build absolute URL
    if href.startswith('http'):
        return href
    else:
        # Relative URL - join with base
        return urljoin(base_url, href)


def extract_page_number(url: str) -> int:
    """Extract page number from URL.

    Args:
        url: URL potentially containing page parameter

    Returns:
        Page number (1-indexed), defaults to 1 if not found

    Examples:
        >>> extract_page_number("https://goodreads.com/review/list/123?page=3")
        3
        >>> extract_page_number("https://goodreads.com/review/list/123")
        1
    """
    if '?page=' in url:
        try:
            page_str = url.split('?page=')[-1].split('&')[0]
            return int(page_str)
        except (ValueError, IndexError):
            return 1
    elif '&page=' in url:
        try:
            page_str = url.split('&page=')[-1].split('&')[0]
            return int(page_str)
        except (ValueError, IndexError):
            return 1

    return 1


def build_library_url(profile_url: str, page: int = 1, shelf: str = "all") -> str:
    """Build library list URL with pagination and shelf filter.

    Args:
        profile_url: Goodreads profile URL (e.g., /user/show/12345-username)
        page: Page number (1-indexed)
        shelf: Shelf to filter by (default "all")

    Returns:
        Full library URL with pagination parameters

    Examples:
        >>> build_library_url("https://www.goodreads.com/user/show/12345", page=2)
        'https://www.goodreads.com/review/list/12345?page=2&shelf=all'
    """
    # Extract user ID from profile URL
    if '/user/show/' in profile_url:
        user_id = profile_url.split('/user/show/')[-1].split('-')[0].split('?')[0]
    else:
        raise ValueError(f"Invalid profile URL: {profile_url}")

    # Build library list URL
    base_url = f"https://www.goodreads.com/review/list/{user_id}"

    params = []
    if page > 1:
        params.append(f"page={page}")
    if shelf and shelf != "all":
        params.append(f"shelf={shelf}")
    elif shelf == "all":
        params.append("shelf=all")

    if params:
        return f"{base_url}?{'&'.join(params)}"
    else:
        return base_url
