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

See component-specific README files:
- [Parse Component](./parse/README.md) - **Start here for current development**
- [UI Component](./ui/README.md) *(coming soon)*
- [API Component](./api/README.md) *(coming soon)*

## Development Workflow

This project uses the [Specify](https://github.com/clamytoe/specify) workflow for structured feature development.

Feature specifications and implementation plans are in the `specs/` directory.
