# Research: Scrape Goodreads Library

**Feature**: 001-scrape-goodreads-library
**Date**: 2025-10-28
**Purpose**: Resolve technical unknowns from Technical Context and establish technology stack

## Technology Stack Decisions

### 1. Language & Version

**Decision**: Python 3.10 minimum, Python 3.12 recommended

**Rationale**:
- Python dominates web scraping ecosystem with mature libraries (BeautifulSoup, httpx, pydantic)
- Python 3.10+ provides modern type hints (`str | None`) and pattern matching for complex parsing
- Python 3.12 offers 75% faster asyncio performance and improved error messages
- All target libraries (httpx, pydantic v2, pytest) fully support Python 3.10-3.12
- Cross-platform compatibility (Linux, macOS, Windows) without platform-specific dependencies
- Python 3.10 has security support until October 2026, Python 3.12 until October 2028

**Alternatives Considered**:
- **Python 3.9**: Ends security support October 2025 - too soon for new project
- **Python 3.13**: Released October 2024 but library ecosystem still maturing, experimental features
- **Go/Rust**: Higher performance but smaller scraping ecosystems, steeper learning curve
- **Node.js**: Good scraping libraries (Cheerio, Playwright) but Python ecosystem more mature for data processing

### 2. HTML Parser

**Decision**: BeautifulSoup 4 with lxml parser

**Rationale**:
- Goodreads HTML is often malformed or inconsistent; BeautifulSoup excels at handling poorly formatted HTML
- Automatic encoding detection handles international book titles and author names
- Simple, intuitive API with excellent error handling for maintainability
- Using lxml as backend parser (`BeautifulSoup(html, 'lxml')`) provides near-native lxml speed with BeautifulSoup robustness
- Extensive documentation and large community support

**Alternatives Considered**:
- **Pure lxml**: Faster but less forgiving with malformed HTML, risky for unpredictable Goodreads markup
- **Parsel**: Middle ground but adds complexity without significant benefits
- **html5lib**: Most lenient parser but significantly slower
- **Selectolax**: Fastest option but requires well-formed HTML, limited documentation

**Key Features**:
- Automatic encoding detection
- Graceful handling of malformed HTML
- CSS selectors and navigable tree structure
- Can use lxml as backend: `BeautifulSoup(html, 'lxml')`

### 3. HTTP Client

**Decision**: httpx (synchronous mode for MVP, async capability for future)

**Rationale**:
- Supports both synchronous and asynchronous requests - start simple, scale to async if needed
- HTTP/2 support for more efficient communication with Goodreads servers
- Modern API similar to requests but with async capabilities
- Built-in timeout handling with better defaults for production use
- Works seamlessly with aiometer library for rate limiting
- Active development and strong community support in 2024/2025

**Alternatives Considered**:
- **requests**: Industry standard, synchronous only. Good for simplicity but lacks async growth path
- **aiohttp**: Fastest async option but async-only and more complex, overkill for 1 req/sec
- **urllib3**: Too low-level for this use case

**Key Features**:
- Both sync and async API: `httpx.Client()` and `httpx.AsyncClient()`
- HTTP/2 support by default
- Connection pooling and keep-alive
- Requests-compatible API
- Built-in retry and timeout mechanisms

### 4. Rate Limiting

**Decision**: Simple `time.sleep(1)` for MVP (synchronous), aiometer for future async scaling

**Rationale**:
- For 1 request/second in single-process CLI, simple sleep is reliable and transparent
- No external dependencies (Redis, SQLite) needed for single-user tool
- If migrating to async in future, aiometer provides clean `max_per_second` parameter
- Avoids over-engineering for straightforward rate limit requirement

**Alternatives Considered**:
- **PyrateLimiter**: Feature-rich with SQLite/Redis backends, overkill for single-process CLI
- **aiolimiter**: Good async option but aiometer simpler for this use case
- **ratelimit decorator**: Works but less flexible than aiometer for async

**Implementation Approach**:

```python
# MVP: Synchronous
import httpx
import time

client = httpx.Client()
for url in urls:
    response = client.get(url)
    time.sleep(1)  # 1 request per second

# Future: Async with aiometer
import aiometer
import httpx

async def scrape(url):
    async with httpx.AsyncClient() as client:
        return await client.get(url)

results = await aiometer.run_on_each(scrape, urls, max_per_second=1)
```

### 5. Data Validation

**Decision**: Pydantic v2

**Rationale**:
- Pydantic v2 core written in Rust, 10x faster than alternatives (Marshmallow)
- Leverages Python type hints for validation, improving IDE support and code clarity
- Built-in validators for complex types (dates, URLs, etc.)
- ISBN validation available via `pydantic-extra-types` package (ISBN-10/ISBN-13)
- Fast Rust-based JSON parsing with automatic datetime conversion
- Excellent error messages for debugging validation issues
- Industry standard for Python data validation in 2024

**Alternatives Considered**:
- **dataclasses**: Fastest for initialization but no built-in validation
- **attrs + cattrs**: Similar performance to Pydantic but less mature ecosystem
- **Marshmallow**: More flexible schema-driven approach but significantly slower and verbose

**Key Features**:
- Type-based validation using Python type hints
- Custom validators with `@field_validator`
- Automatic type coercion (e.g., "5" -> 5 for integers)
- Nested model validation
- JSON schema generation
- ISBN validation:
  ```python
  from pydantic import BaseModel, Field
  from pydantic_extra_types.isbn import ISBN
  from datetime import datetime

  class Book(BaseModel):
      title: str
      isbn: ISBN  # Validates ISBN-10 and ISBN-13
      rating: int = Field(ge=1, le=5)  # Rating between 1-5
      published_date: datetime | None
  ```

### 6. Testing Framework

**Decision**: pytest

**Rationale**:
- De facto standard for Python testing in 2024, surpassing unittest in popularity
- Plain `assert` statements instead of verbose `self.assertEqual()` methods
- Detailed assertion introspection for better error messages
- Powerful fixture system for test setup/teardown
- 800+ plugins for coverage, parallel testing, mocking
- Native support for async testing with `pytest-asyncio`
- Backward compatible with unittest tests

**Alternatives Considered**:
- **unittest**: Part of standard library (zero dependencies) but verbose, less flexible
- **nose2**: Less actively maintained than pytest

**Key Features**:
- Simple test discovery (`test_*.py` files, `test_*()` functions)
- Parametrized testing with `@pytest.mark.parametrize`
- Fixtures for reusable test setup
- Plugin ecosystem:
  - `pytest-cov` for coverage reports
  - `pytest-asyncio` for async tests
  - `pytest-mock` for mocking
  - `pytest-xdist` for parallel execution

## Additional Dependencies

### CLI Framework

**Decision**: Click (defer to implementation phase)

**Rationale**: Most popular Python CLI framework, integrates well with testing

### Logging

**Decision**: Standard library `logging` with structured logging via `structlog`

**Rationale**: Constitution Principle V requires structured logging for data transformations

### Progress Indication

**Decision**: tqdm or rich

**Rationale**: SC-006 requires progress indication. tqdm is simplest, rich provides better UX

## Dependency Specification

```toml
[project]
name = "goodreads-explorer"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "beautifulsoup4>=4.12.0",
    "lxml>=5.0.0",
    "httpx>=0.25.0",
    "pydantic>=2.5.0",
    "pydantic-extra-types>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "pytest-mock>=3.12.0",
]
```

## Architecture Decisions

### Synchronous vs. Asynchronous

**Decision**: Start with synchronous implementation for MVP

**Rationale**:
- 1 req/sec rate limit means async benefits are minimal (waiting dominates execution time)
- Synchronous code is simpler to debug and maintain
- httpx provides async migration path if scaling needed in future
- Constitution Principle VII (Simplicity): Start simple, optimize when bottlenecks identified

**Migration Path**: If async needed later:
1. Replace `httpx.Client()` with `httpx.AsyncClient()`
2. Add `async`/`await` keywords to scraping functions
3. Replace `time.sleep(1)` with `await aiometer.run_on_each(..., max_per_second=1)`

### Error Handling Strategy

**Decision**: Retry with exponential backoff for transient errors

**Rationale**: FR-009 requires graceful network error handling

**Implementation**: Use httpx built-in transport with custom retry logic or `tenacity` library

### Data Export Strategy

**Decision**: Separate exporters for JSON and CSV with schema versioning

**Rationale**:
- Constitution Principle I (Data-First): Include schema version in exports
- JSON: Native Pydantic support via `model_dump_json()`
- CSV: Flatten nested structures (UserBookRelation -> one row per book-shelf combination)

## Research Conclusions

All NEEDS CLARIFICATION items from Technical Context resolved:

1. **Language/Version**: Python 3.10+ (3.12 recommended) ✅
2. **Primary Dependencies**: BeautifulSoup4 + lxml, httpx, pydantic v2 ✅
3. **Testing**: pytest with asyncio, cov, mock plugins ✅

No blockers identified. Technology stack aligns with Constitution principles:
- ✅ Data-First: Pydantic for data models and validation
- ✅ CLI & Library: httpx and BeautifulSoup are library-first, CLI wrapper thin
- ✅ TDD: pytest enables test-first development
- ✅ Integration Testing: pytest-asyncio for async integration tests
- ✅ Observability: structlog for structured logging
- ✅ Data Validation: Pydantic with ISBN, rating, date validators

Ready to proceed to Phase 1: Design & Contracts.
