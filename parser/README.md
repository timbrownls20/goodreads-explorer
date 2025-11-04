# Goodreads Explorer - Parse Component

Python-based scraping and parsing component for extracting Goodreads library data.

## Structure

```
parser/
├── src/                 # Python source code
│   ├── models/         # Pydantic data models
│   ├── parsers/        # HTML parsing logic (BeautifulSoup)
│   ├── scrapers/       # Scraping orchestration
│   ├── validators/     # Data validation
│   ├── exporters/      # JSON/CSV export
│   ├── cli/            # Command-line interface
│   └── lib/            # Public library API
├── tests/              # Test suite
│   ├── contract/       # Contract tests
│   ├── integration/    # Integration tests
│   └── unit/           # Unit tests
└── pyproject.toml      # Python project configuration
```

## Requirements

- **Python 3.10 or higher** (Python 3.13.6 recommended)
- Use `python3` command (not `python`)

## Installation

```bash
cd parser
python3 -m pip install -e ".[dev]"
```

## Quick Start

**See [Quickstart Guide](../specs/001-scrape-goodreads-library/quickstart.md)** for detailed installation and usage examples.

### Basic Usage

```bash
# Scrape a library and export to JSON
goodreads-explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown

# Export to CSV
goodreads-explorer scrape https://www.goodreads.com/user/show/172435467-tim-brown --format csv
```

### Library API

```python
from parser.src.lib import scrape_library

library = scrape_library("https://www.goodreads.com/user/show/172435467-tim-brown")
print(f"Scraped {library.total_books} books for {library.username}")
```

## Development

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Type checking
mypy src

# Linting
ruff check src
```
