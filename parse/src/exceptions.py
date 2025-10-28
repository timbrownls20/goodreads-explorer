"""Custom exceptions for Goodreads Explorer."""


class GoodreadsExplorerError(Exception):
    """Base exception for all Goodreads Explorer errors."""

    pass


class InvalidURLError(GoodreadsExplorerError):
    """Raised when a provided URL is invalid or malformed."""

    def __init__(self, url: str, message: str | None = None) -> None:
        self.url = url
        self.message = message or f"Invalid Goodreads URL: {url}"
        super().__init__(self.message)


class PrivateProfileError(GoodreadsExplorerError):
    """Raised when attempting to scrape a private Goodreads profile."""

    def __init__(self, url: str) -> None:
        self.url = url
        self.message = f"Cannot scrape private Goodreads profile: {url}"
        super().__init__(self.message)


class NetworkError(GoodreadsExplorerError):
    """Raised when a network operation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class RateLimitError(GoodreadsExplorerError):
    """Raised when rate limiting threshold is exceeded."""

    def __init__(self, message: str | None = None) -> None:
        self.message = message or "Rate limit exceeded. Please wait before retrying."
        super().__init__(self.message)


class ValidationError(GoodreadsExplorerError):
    """Raised when data validation fails."""

    def __init__(self, field: str, value: str, message: str | None = None) -> None:
        self.field = field
        self.value = value
        self.message = message or f"Validation failed for {field}: {value}"
        super().__init__(self.message)


class ScrapingError(GoodreadsExplorerError):
    """Raised when HTML parsing or scraping fails."""

    def __init__(self, message: str, url: str | None = None) -> None:
        self.message = message
        self.url = url
        full_message = f"{message} (URL: {url})" if url else message
        super().__init__(full_message)
