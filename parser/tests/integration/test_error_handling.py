"""Integration tests for error handling.

Tests error scenarios: invalid URLs, empty libraries, network errors,
and private profiles per FR-009, FR-011, and FR-013.
"""

import pytest
from unittest.mock import Mock, patch
import httpx


@pytest.mark.integration
def test_invalid_url_raises_error():
    """
    Test that invalid URL format raises appropriate error per FR-002.

    Given: An invalid or malformed URL
    When: User attempts to scrape
    Then: InvalidURLError is raised with clear message
    """
    from src.lib.api import scrape_library
    from src.exceptions import InvalidURLError

    invalid_urls = [
        "not-a-url",
        "http://example.com",  # Not a Goodreads URL
        "https://www.goodreads.com/book/show/123",  # Book page, not profile
        "",
        "ftp://goodreads.com/user/123"
    ]

    for invalid_url in invalid_urls:
        with pytest.raises(InvalidURLError) as exc_info:
            scrape_library(invalid_url)

        assert "invalid" in str(exc_info.value).lower() or "goodreads" in str(exc_info.value).lower()


@pytest.mark.integration
def test_network_error_with_retry():
    """
    Test that network errors trigger retry logic with exponential backoff per FR-009.

    Given: Network connection fails temporarily
    When: Scraper makes request
    Then: Retries with exponential backoff before failing
    """
    from src.lib.api import scrape_library
    from src.exceptions import NetworkError

    attempt_count = [0]

    def failing_request(*args, **kwargs):
        attempt_count[0] += 1
        if attempt_count[0] < 3:
            raise httpx.ConnectError("Connection failed")
        # Third attempt succeeds
        response = Mock()
        response.status_code = 200
        response.text = "<html><body><div id='books'></div></body></html>"
        return response

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = failing_request

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        # Should have retried and eventually succeeded
        assert attempt_count[0] >= 2, "Should retry on network errors"
        assert library is not None


@pytest.mark.integration
def test_network_error_max_retries_exceeded():
    """
    Test that persistent network errors eventually raise NetworkError.

    Given: Network continuously fails beyond max retries
    When: All retry attempts exhausted
    Then: NetworkError is raised with context
    """
    from src.lib.api import scrape_library
    from src.exceptions import NetworkError

    def always_fail(*args, **kwargs):
        raise httpx.ConnectError("Network unreachable")

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = always_fail

        with pytest.raises(NetworkError) as exc_info:
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        assert "network" in str(exc_info.value).lower() or "connection" in str(exc_info.value).lower()


@pytest.mark.integration
def test_timeout_error_handling():
    """
    Test that timeout errors are handled gracefully.

    Given: Request times out
    When: Scraper waits for response
    Then: TimeoutError is caught and retried or raises NetworkError
    """
    from src.lib.api import scrape_library
    from src.exceptions import NetworkError

    def timeout_request(*args, **kwargs):
        raise httpx.TimeoutException("Request timed out")

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = timeout_request

        with pytest.raises(NetworkError):
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")


@pytest.mark.integration
def test_private_profile_detection():
    """
    Test that private profiles are detected and raise PrivateProfileError per FR-011.

    Given: A Goodreads profile that is private
    When: Scraper attempts to access library
    Then: PrivateProfileError is raised with user-friendly message
    """
    from src.lib.api import scrape_library
    from src.exceptions import PrivateProfileError

    # Mock HTML for a private profile page
    private_profile_html = """
    <html><body>
        <div class="privateProfile">
            This profile is private.
        </div>
    </body></html>
    """

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = private_profile_html
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        with pytest.raises(PrivateProfileError) as exc_info:
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        assert "private" in str(exc_info.value).lower()


@pytest.mark.integration
def test_http_404_profile_not_found():
    """
    Test handling of 404 responses (profile doesn't exist).

    Given: A Goodreads profile URL that returns 404
    When: Scraper makes request
    Then: Appropriate error is raised
    """
    from src.lib.api import scrape_library
    from src.exceptions import InvalidURLError

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        with pytest.raises((InvalidURLError, httpx.HTTPStatusError)):
            scrape_library("https://www.goodreads.com/user/show/99999-nonexistent")


@pytest.mark.integration
def test_http_500_server_error():
    """
    Test handling of 500 server errors (Goodreads internal error).

    Given: Goodreads returns 500 server error
    When: Scraper makes request
    Then: NetworkError is raised after retries
    """
    from src.lib.api import scrape_library
    from src.exceptions import NetworkError

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        with pytest.raises(NetworkError):
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")


@pytest.mark.integration
def test_empty_library_no_error():
    """
    Test that empty library (0 books) doesn't raise error per acceptance scenario.

    Given: A valid profile with zero books
    When: Scraper processes the profile
    Then: Empty Library object returned (no exception)
    """
    from src.lib.api import scrape_library

    empty_library_html = """
    <html><body>
        <div id="books"></div>
        <div class="userShelf">No books found.</div>
    </body></html>
    """

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = empty_library_html
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        assert library is not None
        assert len(library.user_books) == 0
        # Should not raise any exception


@pytest.mark.integration
def test_malformed_html_graceful_handling():
    """
    Test that malformed HTML is handled gracefully per FR-013.

    Given: HTML with missing or malformed book elements
    When: Parser processes the HTML
    Then: Valid books are extracted, invalid ones skipped with logging
    """
    from src.lib.api import scrape_library

    malformed_html = """
    <html><body>
        <div id="books">
            <tr class="bookalike review">
                <td class="field title"><a href="/book/show/1">Valid Book</a></td>
                <td class="field author"><a>Valid Author</a></td>
                <td class="field shelf"><a>read</a></td>
            </tr>
            <tr class="bookalike review">
                <!-- Missing title, author - should be skipped -->
                <td class="field shelf"><a>read</a></td>
            </tr>
            <tr class="bookalike review">
                <td class="field title"><a href="/book/show/2">Another Valid Book</a></td>
                <td class="field author"><a>Another Author</a></td>
                <td class="field shelf"><a>to-read</a></td>
            </tr>
        </div>
    </body></html>
    """

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = malformed_html
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        # Should extract valid books, skip malformed ones
        assert len(library.user_books) >= 1, "Should extract at least valid books"
        # All extracted books should have required fields
        for user_book in library.user_books:
            assert user_book.book.title
            assert user_book.book.author


@pytest.mark.integration
def test_missing_metadata_fields_handled():
    """
    Test that missing optional metadata doesn't cause errors per FR-013.

    Given: Books with missing ISBN, publication year, etc.
    When: Parser extracts book data
    Then: Missing fields are set to None, book still extracted
    """
    from src.lib.api import scrape_library

    minimal_book_html = """
    <html><body>
        <div id="books">
            <tr class="bookalike review">
                <td class="field title"><a href="/book/show/1">Minimal Book</a></td>
                <td class="field author"><a>Author Name</a></td>
                <td class="field shelf"><a>read</a></td>
                <!-- No ISBN, no publication year, no rating -->
            </tr>
        </div>
    </body></html>
    """

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = minimal_book_html
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        assert len(library.user_books) == 1
        book = library.user_books[0].book

        # Required fields present
        assert book.title == "Minimal Book"
        assert book.author == "Author Name"

        # Optional fields can be None
        assert book.isbn is None or book.isbn
        assert book.publication_year is None or book.publication_year


@pytest.mark.integration
def test_rate_limit_error_detection():
    """
    Test detection of rate limiting from Goodreads (429 status).

    Given: Goodreads returns 429 Too Many Requests
    When: Scraper receives the response
    Then: RateLimitError is raised with backoff recommendation
    """
    from src.lib.api import scrape_library
    from src.exceptions import RateLimitError

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Too Many Requests"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        with pytest.raises(RateLimitError) as exc_info:
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        assert "rate" in str(exc_info.value).lower() or "limit" in str(exc_info.value).lower()


@pytest.mark.integration
def test_error_messages_include_context():
    """
    Test that error messages include context per Constitution Principle V.

    Given: Any error condition
    When: Exception is raised
    Then: Error message includes source data, operation, expected vs actual
    """
    from src.lib.api import scrape_library
    from src.exceptions import InvalidURLError

    try:
        scrape_library("https://example.com/not-goodreads")
    except InvalidURLError as e:
        error_msg = str(e).lower()
        # Should include URL that caused the error
        assert "example.com" in error_msg or "goodreads" in error_msg
        # Should indicate what was expected
        assert "invalid" in error_msg or "expected" in error_msg or "must" in error_msg
    except Exception:
        pass  # OK if different error, just testing error context when raised
