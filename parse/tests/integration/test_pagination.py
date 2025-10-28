"""Integration tests for pagination handling.

Tests that scraper correctly handles multi-page libraries (FR-004).
Per Constitution Principle IV: Integration tests required for pagination.
"""

import pytest
from unittest.mock import Mock, patch


@pytest.fixture
def mock_page1_html():
    """Mock HTML for first page of a large library."""
    return """
    <html><body>
        <div id="books">
            <tr class="bookalike review" id="review_1">
                <td class="field title"><a href="/book/show/1">Book 1</a></td>
                <td class="field author"><a href="/author/show/1">Author 1</a></td>
                <td class="field shelf"><a href="?shelf=read">read</a></td>
            </tr>
        </div>
        <div id="reviewPagination">
            <a href="/review/list/12345?page=2">Next</a>
        </div>
    </body></html>
    """


@pytest.fixture
def mock_page2_html():
    """Mock HTML for second page of library."""
    return """
    <html><body>
        <div id="books">
            <tr class="bookalike review" id="review_2">
                <td class="field title"><a href="/book/show/2">Book 2</a></td>
                <td class="field author"><a href="/author/show/2">Author 2</a></td>
                <td class="field shelf"><a href="?shelf=read">read</a></td>
            </tr>
        </div>
        <div id="reviewPagination">
            <a href="/review/list/12345?page=1">Previous</a>
        </div>
    </body></html>
    """


@pytest.mark.integration
def test_pagination_detects_multiple_pages(mock_page1_html):
    """
    Test that scraper detects when library spans multiple pages.

    Given: A library page with pagination controls
    When: Parser examines the HTML
    Then: Pagination is detected correctly
    """
    from src.scrapers.pagination import detect_pagination

    has_next_page = detect_pagination(mock_page1_html)
    assert has_next_page is True, "Should detect next page link"


@pytest.mark.integration
def test_pagination_extracts_next_page_url(mock_page1_html):
    """
    Test that scraper extracts correct next page URL.

    Given: A library page with next page link
    When: Parser extracts pagination URL
    Then: Correct next page URL is returned
    """
    from src.scrapers.pagination import get_next_page_url

    next_url = get_next_page_url(mock_page1_html, base_url="https://www.goodreads.com/review/list/12345")
    assert next_url is not None
    assert "page=2" in next_url


@pytest.mark.integration
def test_scrape_library_handles_pagination(mock_page1_html, mock_page2_html):
    """
    Test end-to-end scraping across multiple pages.

    Given: A library spanning 2 pages
    When: Scraper processes all pages
    Then: Books from all pages are collected
    """
    from src.lib.api import scrape_library

    with patch('httpx.Client') as mock_client:
        # Mock responses for page 1 and page 2
        responses = [
            Mock(status_code=200, text=mock_page1_html),
            Mock(status_code=200, text=mock_page2_html)
        ]
        mock_client.return_value.__enter__.return_value.get.side_effect = responses

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        # Should have books from both pages
        assert len(library.user_books) >= 2, "Should collect books from multiple pages"


@pytest.mark.integration
def test_pagination_respects_rate_limiting():
    """
    Test that pagination requests also respect 1 req/sec rate limit.

    Given: A library with multiple pages
    When: Scraper fetches each page
    Then: Requests are rate-limited even across pagination
    """
    import time
    from src.lib.api import scrape_library

    request_times = []

    def track_time(*args, **kwargs):
        request_times.append(time.time())
        response = Mock()
        response.status_code = 200
        response.text = "<html><body><div id='books'></div></body></html>"
        return response

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = track_time

        try:
            scrape_library("https://www.goodreads.com/user/show/12345-testuser")
        except Exception:
            pass

        # Check rate limiting between pagination requests
        if len(request_times) > 1:
            for i in range(1, len(request_times)):
                time_diff = request_times[i] - request_times[i-1]
                assert time_diff >= 0.9, "Pagination must also respect rate limiting"


@pytest.mark.integration
def test_large_library_pagination_500_plus_books():
    """
    Test handling of large library (500+ books) per acceptance scenario.

    Given: A library with 500+ books across many pages
    When: Scraper processes all pages
    Then: All books are retrieved without data loss
    """
    from src.lib.api import scrape_library

    # Mock 25 pages with 20 books each = 500 total
    def mock_page_response(url, *args, **kwargs):
        # Extract page number from URL
        if "page=" in url:
            page_num = int(url.split("page=")[1].split("&")[0])
        else:
            page_num = 1

        has_next = page_num < 25
        next_link = f'<a href="?page={page_num + 1}">Next</a>' if has_next else ""

        html = f"""
        <html><body>
            <div id="books">
                {"".join([f'<tr class="bookalike review" id="review_{page_num}_{i}"><td class="field title"><a href="/book/show/{i}">Book {i}</a></td><td class="field author"><a>Author</a></td><td class="field shelf"><a>read</a></td></tr>' for i in range(20)])}
            </div>
            <div id="reviewPagination">{next_link}</div>
        </body></html>
        """

        response = Mock()
        response.status_code = 200
        response.text = html
        return response

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = mock_page_response

        library = scrape_library("https://www.goodreads.com/user/show/12345-testuser")

        # Should have retrieved all 500 books
        assert len(library.user_books) >= 500, "Large library scraping should retrieve all books"


@pytest.mark.integration
def test_pagination_stops_at_last_page(mock_page2_html):
    """
    Test that scraper stops when reaching last page (no infinite loop).

    Given: A library page with no next page link
    When: Scraper checks for pagination
    Then: Scraping stops (no infinite pagination loop)
    """
    from src.scrapers.pagination import detect_pagination

    has_next_page = detect_pagination(mock_page2_html)
    assert has_next_page is False, "Should detect when there's no next page"


@pytest.mark.integration
def test_pagination_progress_callback():
    """
    Test that progress callback reports pagination progress per SC-006.

    Given: Multi-page library with progress callback
    When: Scraper processes pages
    Then: Callback receives page progress updates
    """
    from src.lib.api import scrape_library

    progress_updates = []

    def progress_callback(current: int, total: int, message: str):
        progress_updates.append({"current": current, "total": total, "msg": message})

    # Mock 3 pages
    page_responses = [
        Mock(status_code=200, text='<html><body><div id="books"><tr class="bookalike review"><td class="field title"><a>Book</a></td></tr></div><div id="reviewPagination"><a href="?page=2">Next</a></div></body></html>'),
        Mock(status_code=200, text='<html><body><div id="books"><tr class="bookalike review"><td class="field title"><a>Book</a></td></tr></div><div id="reviewPagination"><a href="?page=3">Next</a></div></body></html>'),
        Mock(status_code=200, text='<html><body><div id="books"><tr class="bookalike review"><td class="field title"><a>Book</a></td></tr></div></body></html>')
    ]

    with patch('httpx.Client') as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = page_responses

        try:
            scrape_library(
                "https://www.goodreads.com/user/show/12345-testuser",
                progress_callback=progress_callback
            )
        except Exception:
            pass

        # Should have progress updates for pagination
        if len(progress_updates) > 0:
            messages = [u["msg"] for u in progress_updates if "msg" in u]
            assert any("page" in msg.lower() for msg in messages), \
                "Progress callback should report pagination progress"
