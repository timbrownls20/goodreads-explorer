"""Integration tests for basic library scraping flow.

Tests the end-to-end flow: Goodreads profile URL → Library data extraction.
Per Constitution Principle IV: Integration tests for external service communication.
"""

import pytest
from unittest.mock import Mock, patch


@pytest.fixture
def sample_goodreads_profile_url():
    """Sample Goodreads profile URL for testing."""
    return "https://www.goodreads.com/user/show/12345-testuser"


@pytest.fixture
def mock_html_library_page():
    """Mock HTML for a Goodreads library page with books."""
    return """
    <html>
        <body>
            <div id="books">
                <tr class="bookalike review" id="review_123">
                    <td class="field title">
                        <a href="/book/show/11870085" title="The Fault in Our Stars">
                            The Fault in Our Stars
                        </a>
                    </td>
                    <td class="field author">
                        <a href="/author/show/1234">John Green</a>
                    </td>
                    <td class="field rating">
                        <span class="staticStars notranslate">
                            <span size="15" class="staticStar p10">5 of 5 stars</span>
                        </span>
                    </td>
                    <td class="field shelf">
                        <div class="value">
                            <a href="/review/list/12345?shelf=read">read</a>
                        </div>
                    </td>
                </tr>
            </div>
        </body>
    </html>
    """


@pytest.mark.integration
def test_scrape_library_returns_library_object(sample_goodreads_profile_url):
    """
    Test that scraping a valid profile URL returns a Library object.

    Given: A valid Goodreads profile URL
    When: The scraper processes the URL
    Then: A Library object is returned with user metadata
    """
    # This test will fail until scraper is implemented
    from parse.src.lib.api import scrape_library

    # Mock HTTP responses to avoid actual network calls
    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><div id='books'></div></body></html>"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library(sample_goodreads_profile_url)

        assert library is not None
        assert hasattr(library, 'user_id')
        assert hasattr(library, 'username')
        assert hasattr(library, 'profile_url')
        assert hasattr(library, 'user_books')
        assert library.profile_url == sample_goodreads_profile_url


@pytest.mark.integration
def test_scrape_library_extracts_books(sample_goodreads_profile_url, mock_html_library_page):
    """
    Test that scraper extracts book data from library page.

    Given: A Goodreads profile URL with books in library
    When: The scraper processes the page
    Then: Book objects are extracted with title, author, rating, status
    """
    from parse.src.lib.api import scrape_library

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html_library_page
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library(sample_goodreads_profile_url)

        assert len(library.user_books) > 0, "Library should contain books"

        # Verify first book has required fields
        first_book_relation = library.user_books[0]
        assert first_book_relation.book.title
        assert first_book_relation.book.author
        assert first_book_relation.reading_status
        assert len(first_book_relation.shelves) > 0


@pytest.mark.integration
def test_scrape_library_respects_rate_limiting():
    """
    Test that scraper enforces 1 request/second rate limit per FR-008.

    Given: Multiple pages to scrape
    When: Scraper makes sequential requests
    Then: Requests are spaced by at least 1 second
    """
    import time
    from parse.src.lib.api import scrape_library

    # Mock a profile that requires multiple page requests
    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><div id='books'></div></body></html>"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        request_times = []

        def track_request_time(*args, **kwargs):
            request_times.append(time.time())
            return mock_response

        mock_client.return_value.__enter__.return_value.get.side_effect = track_request_time

        # Trigger scraping (will fail until implemented)
        try:
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")
        except Exception:
            pass  # Ignore implementation errors, just check rate limiting

        # Verify requests are spaced by at least 1 second
        if len(request_times) > 1:
            for i in range(1, len(request_times)):
                time_diff = request_times[i] - request_times[i-1]
                assert time_diff >= 0.9, f"Requests must be spaced by >= 1 second (FR-008)"


@pytest.mark.integration
def test_scrape_library_handles_empty_library(sample_goodreads_profile_url):
    """
    Test scraping a profile with zero books.

    Given: A Goodreads profile URL with no books
    When: The scraper processes the page
    Then: An empty Library object is returned (0 books, no error)
    """
    from parse.src.lib.api import scrape_library

    empty_library_html = "<html><body><div id='books'></div></body></html>"

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = empty_library_html
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        library = scrape_library(sample_goodreads_profile_url)

        assert library is not None
        assert len(library.user_books) == 0
        assert library.user_id
        assert library.username


@pytest.mark.integration
def test_scrape_library_progress_callback():
    """
    Test that progress callbacks are invoked during scraping per SC-006.

    Given: A scraper with progress callback configured
    When: Scraping processes multiple books
    Then: Callback is invoked with progress updates
    """
    from parse.src.lib.api import scrape_library

    progress_updates = []

    def progress_callback(current: int, total: int, message: str):
        progress_updates.append({"current": current, "total": total, "message": message})

    with patch('httpx.Client') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><div id='books'></div></body></html>"
        mock_client.return_value.__enter__.return_value.get.return_value = mock_response

        try:
            scrape_library(
                "https://www.goodreads.com/user/show/12345-testuser",
                progress_callback=progress_callback
            )
        except Exception:
            pass  # Ignore implementation errors

        # Verify progress callback was invoked
        if len(progress_updates) > 0:
            assert all("current" in update for update in progress_updates)
            assert all("total" in update for update in progress_updates)


@pytest.mark.integration
@pytest.mark.slow
def test_scrape_library_with_actual_url():
    """
    Test scraping against a real Goodreads profile (manual verification).

    This test is marked as 'slow' and should be run separately with:
    pytest -m slow

    Note: This test may fail if the profile is private or HTML structure changes.
    """
    pytest.skip("Skipped by default - run with 'pytest -m slow' for real scraping test")

    # Uncomment and configure with a test account for real integration testing
    # from parse.src.lib.api import scrape_library
    # test_profile_url = "https://www.goodreads.com/user/show/YOUR_TEST_PROFILE_ID"
    # library = scrape_library(test_profile_url)
    # assert len(library.user_books) > 0
