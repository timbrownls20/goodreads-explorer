# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-14

### Added
- Initial release of TypeScript Goodreads parser
- Complete feature parity with Python parser
- CLI interface with Commander
- Library API for programmatic usage
- Data models with class-validator
- HTML parsing with Cheerio
- HTTP client with Axios
- JSON and CSV exporters
- URL and data validators
- Custom exception classes
- Comprehensive test suite (39 tests)
- Rate limiting and retry logic
- Progress tracking callbacks
- Winston logger integration
- TypeScript type definitions
- Documentation and examples

### Features
- Scrape Goodreads user libraries
- Parse books, ratings, shelves, reviews, and read records
- Export to JSON or CSV formats
- Individual book file exports
- Configurable rate limiting (default 1 req/sec)
- Automatic retry with exponential backoff (default 3 retries)
- Request timeout handling (default 30 seconds)
- Data validation (ISBN, ratings, dates, etc.)
- Genre normalization
- Private profile detection
- URL normalization
- Sort options (date-read, date-added, title, author, rating)
- Book limit option
- Progress callbacks

### Technical
- TypeScript 5.3.3
- Node.js 18+
- ESLint + Prettier
- Jest testing framework
- Modular architecture
- Full type safety
- Decorator-based validation
