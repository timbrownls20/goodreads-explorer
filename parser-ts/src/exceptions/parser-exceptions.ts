export class GoodreadsExplorerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoodreadsExplorerError';
  }
}

export class InvalidURLError extends GoodreadsExplorerError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidURLError';
  }
}

export class PrivateProfileError extends GoodreadsExplorerError {
  constructor(message: string = 'This profile is private') {
    super(message);
    this.name = 'PrivateProfileError';
  }
}

export class NetworkError extends GoodreadsExplorerError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends GoodreadsExplorerError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends GoodreadsExplorerError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ScrapingError extends GoodreadsExplorerError {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapingError';
  }
}
