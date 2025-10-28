# Goodreads Explorer

Multi-component application for scraping, exploring, and analyzing Goodreads library data.

Imports library information and provides enhanced charting and metrics.

## Project Structure

This is a multi-component monorepo with separate codebases for different concerns:

```
goodreads-explorer/
├── parse/          # Python scraping & parsing component
│   ├── src/       # Python source (models, parsers, scrapers, exporters, CLI)
│   ├── tests/     # Python test suite
│   └── pyproject.toml
├── ui/            # React-based user interface (coming soon)
├── api/           # Node.js API layer (coming soon)
└── specs/         # Feature specifications & implementation plans
```

### Components

#### Parse Component (Python)
- Scrapes Goodreads library data from profile URLs
- Parses HTML with BeautifulSoup
- Exports to JSON/CSV
- Provides CLI and library API
- **Status**: In Development (MVP phase)

#### UI Component (React) *(Coming Soon)*
- Web UI for exploring library data
- Data visualization and analytics
- Interactive charts and metrics

#### API Component (Node.js) *(Coming Soon)*
- REST API for data access
- Integration layer between parse and UI

## Technology Stack

- **Parse**: Python 3.10+, BeautifulSoup4, Pydantic, httpx
- **UI**: React, TypeScript (planned)
- **API**: Node.js, Express (planned)
- **Infrastructure**: Docker (planned)

## Getting Started

**Quick Start**: See [Parse Component Quickstart](./specs/001-scrape-goodreads-library/quickstart.md) for installation and usage examples.

Component-specific documentation:
- [Parse Component README](./parse/README.md) - **Start here for current development**
- [UI Component](./ui/README.md) *(coming soon)*
- [API Component](./api/README.md) *(coming soon)*

## Requirements

- **Python 3.10 or higher** (Python 3.13.6 recommended)
  - Use `python3` command (not `python`)
  - Install with: `python3 -m pip install -e parse/`

## Development Workflow

This project uses the [Specify](https://github.com/clamytoe/specify) workflow for structured feature development.

Feature specifications and implementation plans are in the `specs/` directory.
