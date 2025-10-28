"""URL validation for Goodreads profile URLs.

Validates that URLs point to valid Goodreads user profiles per FR-002.
Per Constitution Principle VI: Data Quality & Validation.
"""

import re
from urllib.parse import urlparse

from parse.src.exceptions import InvalidURLError


# Goodreads profile URL patterns
GOODREADS_PROFILE_PATTERN = re.compile(
    r'^https?://(?:www\.)?goodreads\.com/user/show/(\d+)(?:-[\w-]+)?(?:\?.*)?$',
    re.IGNORECASE
)


def validate_goodreads_profile_url(url: str) -> tuple[bool, str, str | None]:
    """Validate a Goodreads profile URL.

    Args:
        url: URL string to validate

    Returns:
        Tuple of (is_valid, normalized_url, user_id)
        - is_valid: Whether URL is a valid Goodreads profile URL
        - normalized_url: Normalized URL (https, www removed from domain)
        - user_id: Extracted user ID if valid, None otherwise

    Examples:
        >>> validate_goodreads_profile_url("https://www.goodreads.com/user/show/12345-username")
        (True, "https://www.goodreads.com/user/show/12345-username", "12345")

        >>> validate_goodreads_profile_url("https://example.com")
        (False, "", None)
    """
    if not url or not isinstance(url, str):
        return (False, "", None)

    url = url.strip()

    # Check against pattern
    match = GOODREADS_PROFILE_PATTERN.match(url)
    if not match:
        return (False, "", None)

    user_id = match.group(1)

    # Normalize URL (ensure https, normalize domain)
    parsed = urlparse(url)
    normalized_url = f"https://www.goodreads.com{parsed.path}"
    if parsed.query:
        normalized_url += f"?{parsed.query}"

    return (True, normalized_url, user_id)


def extract_user_id_from_url(url: str) -> str:
    """Extract user ID from a Goodreads profile URL.

    Args:
        url: Goodreads profile URL

    Returns:
        User ID extracted from URL

    Raises:
        InvalidURLError: If URL is not a valid Goodreads profile URL

    Examples:
        >>> extract_user_id_from_url("https://www.goodreads.com/user/show/12345-username")
        "12345"
    """
    is_valid, _, user_id = validate_goodreads_profile_url(url)

    if not is_valid or user_id is None:
        raise InvalidURLError(
            url=url,
            message=f"Invalid Goodreads profile URL. Expected format: "
                    f"https://www.goodreads.com/user/show/USER_ID-username, got: {url}"
        )

    return user_id


def normalize_profile_url(url: str) -> str:
    """Normalize a Goodreads profile URL.

    Args:
        url: Goodreads profile URL to normalize

    Returns:
        Normalized URL (https, consistent format)

    Raises:
        InvalidURLError: If URL is not a valid Goodreads profile URL

    Examples:
        >>> normalize_profile_url("http://goodreads.com/user/show/12345")
        "https://www.goodreads.com/user/show/12345"
    """
    is_valid, normalized_url, _ = validate_goodreads_profile_url(url)

    if not is_valid:
        raise InvalidURLError(
            url=url,
            message=f"Cannot normalize invalid Goodreads profile URL: {url}"
        )

    return normalized_url


def is_goodreads_book_url(url: str) -> bool:
    """Check if URL is a Goodreads book page (not profile).

    Args:
        url: URL to check

    Returns:
        True if URL is a book page, False otherwise

    Examples:
        >>> is_goodreads_book_url("https://www.goodreads.com/book/show/123")
        True
    """
    book_pattern = re.compile(
        r'^https?://(?:www\.)?goodreads\.com/book/show/\d+',
        re.IGNORECASE
    )
    return bool(book_pattern.match(url))
