# Goodreads Explorer - Parse Component

Python-based scraping and parsing component for extracting Goodreads library data.

## Structure

```
parse/
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

## Installation

```bash
cd parse
pip install -e ".[dev]"
```

## Usage

See `specs/001-scrape-goodreads-library/quickstart.md` for detailed usage examples.

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
