# Tasks: Scrape Goodreads Library

**Input**: Design documents from `/specs/001-scrape-goodreads-library/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per Constitution Principle III (TDD is NON-NEGOTIABLE). All tests MUST be written and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Multi-component monorepo**: Each component has its own source directory
- **Parse component**: `parse/src/`, `parse/tests/`
- **UI component** *(future)*: `ui/src/`
- **API component** *(future)*: `api/src/`
- Paths shown below are for the parse component (Python scraping)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create parse component structure with parse/src/ and parse/tests/ directories
- [x] T002 Initialize Python project with parse/pyproject.toml (requires-python >= 3.10)
- [x] T003 [P] Add core dependencies to parse/pyproject.toml (beautifulsoup4, lxml, httpx, pydantic, pydantic-extra-types)
- [x] T004 [P] Add development dependencies to parse/pyproject.toml (pytest, pytest-asyncio, pytest-cov, pytest-mock, structlog)
- [x] T005 [P] Create parse/src/__init__.py package marker
- [x] T006 [P] Create parse/tests/__init__.py package marker
- [x] T007 [P] Configure pytest in parse/pyproject.toml with test discovery and coverage settings
- [x] T008 [P] Create .gitignore for Python project (venv/, __pycache__/, .pytest_cache/, *.pyc, dist/, *.egg-info/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create parse/src/models/ package directory and __init__.py
- [x] T010 [P] Create parse/src/scrapers/ package directory and __init__.py
- [x] T010b [P] Create parse/src/parsers/ package directory and __init__.py
- [x] T011 [P] Create parse/src/validators/ package directory and __init__.py
- [x] T012 [P] Create parse/src/exporters/ package directory and __init__.py
- [x] T013 [P] Create parse/src/cli/ package directory and __init__.py
- [x] T014 [P] Create parse/src/lib/ package directory and __init__.py
- [x] T015 Create parse/tests/contract/ directory for contract tests
- [x] T016 [P] Create parse/tests/integration/ directory for integration tests
- [x] T017 [P] Create parse/tests/unit/ directory for unit tests
- [x] T018 Implement base exception classes in parse/src/exceptions.py (InvalidURLError, PrivateProfileError, NetworkError, RateLimitError, ValidationError)
- [x] T019 Configure structured logging in parse/src/logging_config.py using structlog per Constitution Principle V

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Extract Basic Library Data (Priority: P1) 🎯 MVP

**Goal**: Enable users to scrape basic book data (title, author, rating, reading status) from Goodreads profile URLs and export to JSON/CSV

**Independent Test**: Provide a Goodreads profile URL, verify system returns all books with core fields populated

### Tests for User Story 1 (TDD - Write tests FIRST) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US1] Create contract test for JSON export format in parse/tests/contract/test_json_contract.py (validates schema compliance per contracts/json-export-schema.json)
- [x] T021 [P] [US1] Create contract test for CSV export format in parse/tests/contract/test_csv_contract.py (validates headers, row format, escaping per contracts/csv-export-spec.md)
- [x] T022 [P] [US1] Create integration test for basic library scraping flow in parse/tests/integration/test_scraping_flow.py (end-to-end: URL → Book list)
- [x] T023 [P] [US1] Create integration test for pagination handling in parse/tests/integration/test_pagination.py (large library 500+ books)
- [x] T024 [P] [US1] Create integration test for error handling in parse/tests/integration/test_error_handling.py (invalid URL, empty library, network errors, private profile detection per FR-011)

### Implementation for User Story 1

**Models**:

- [x] T025 [P] [US1] Create Book model in parse/src/models/book.py with core fields (goodreads_id, title, author, goodreads_url) and Pydantic validation
- [x] T026 [P] [US1] Create ReadingStatus enum in parse/src/models/shelf.py for built-in shelves (READ, CURRENTLY_READING, TO_READ); custom shelves stored as List[str] on UserBookRelation
- [x] T027 [P] [US1] Create UserBookRelation model in parse/src/models/user_book.py with user_rating, reading_status, shelves fields
- [x] T028 [P] [US1] Create Library model in parse/src/models/library.py with user_id, username, profile_url, user_books, scraped_at, schema_version fields
- [x] T029 [US1] Add model validation tests in parse/tests/unit/test_models.py (test all required fields, constraints, Pydantic validators)

**Validators**:

- [x] T030 [P] [US1] Implement URL validator in parse/src/validators/url_validator.py (Goodreads profile URL pattern validation per FR-002)
- [x] T031 [P] [US1] Implement data validator in parse/src/validators/data_validator.py (rating 1-5 validation, basic field sanitization)
- [x] T032 [US1] Add validator tests in parse/tests/unit/test_validators.py (valid/invalid URLs, edge cases)

**Parsing Logic**:

- [x] T033 [US1] Implement library page parser in parse/src/parsers/library_parser.py (BeautifulSoup helpers for extracting book list from library pages)
- [x] T034 [US1] Implement book parser in parse/src/parsers/book_parser.py (extract book details from Goodreads HTML)
- [x] T035 [US1] Add parser tests in parse/tests/unit/test_parsers.py (HTML parsing edge cases, malformed HTML handling)

**Scraping Orchestration**:

- [x] T036 [US1] Implement pagination handler in parse/src/scrapers/pagination.py (detect and navigate multi-page libraries per FR-004)
- [x] T037 [US1] Implement main scraper orchestrator in parse/src/scrapers/goodreads_scraper.py (coordinates parsing, pagination, rate limiting per FR-008)
- [x] T038 [US1] Add rate limiting logic to goodreads_scraper.py (1 req/sec with time.sleep(1) per research.md decision)
- [x] T039 [US1] Add retry logic with exponential backoff to goodreads_scraper.py (network error handling per FR-009)
- [x] T040 [US1] Add progress callback support to goodreads_scraper.py (enable progress indication per SC-006)

**Export**:

- [x] T041 [P] [US1] Implement JSON exporter in parse/src/exporters/json_exporter.py (Pydantic model_dump_json with schema_version per FR-010)
- [x] T042 [P] [US1] Implement CSV exporter in parse/src/exporters/csv_exporter.py (flattened format with shelf expansion per contracts/csv-export-spec.md)
- [x] T043 [US1] Add exporter tests in parse/tests/unit/test_exporters.py (JSON schema validation, CSV format compliance)

**Library API**:

- [x] T044 [US1] Implement public library API in parse/src/lib/api.py (scrape_library function with progress callbacks, error handling)
- [x] T045 [US1] Add docstrings and type hints to parse/src/lib/api.py per Constitution Principle II (library-first architecture)

**CLI Interface**:

- [x] T046 [US1] Implement CLI commands in parse/src/cli/commands.py using Click framework (scrape command with URL, format, output-dir args)
- [x] T047 [US1] Add CLI entry point in parse/src/cli/__init__.py
- [x] T048 [US1] Configure CLI in parse/pyproject.toml [project.scripts] section (goodreads-explorer = src.cli:main)
- [x] T049 [US1] Add progress bar to CLI using tqdm or rich library per SC-006

**Integration & Logging**:

- [x] T050 [US1] Add structured logging to scraper (log URLs accessed, book counts, errors per FR-012)
- [x] T051 [US1] Add structured logging to exporters (log export format, file size, schema version)
- [x] T052 [US1] Wire up all components in parse/src/lib/api.py (scraper → validation → export pipeline)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can scrape basic library data and export to JSON/CSV.

---

## Phase 4: User Story 2 - Extract Extended Book Metadata (Priority: P2)

**Goal**: Enhance book data with ISBN, publication details, page count, genres, and custom shelves

**Independent Test**: Extract a library and verify extended metadata fields (ISBN, publication_year, page_count, genres, custom shelves) are populated

### Tests for User Story 2 (TDD - Write tests FIRST) ⚠️

- [ ] T053 [P] [US2] Add extended metadata tests to parse/tests/integration/test_scraping_flow.py (verify ISBN, genres, shelves captured)
- [ ] T054 [P] [US2] Add ISBN validation tests to parse/tests/unit/test_validators.py (ISBN-10/13 checksum validation using pydantic-extra-types)
- [ ] T055 [P] [US2] Add genre/shelf tests to parse/tests/unit/test_models.py (multiple shelves, genre deduplication)

### Implementation for User Story 2

**Models (Extend existing)**:

- [ ] T056 [P] [US2] Add extended fields to Book model in parse/src/models/book.py (isbn, isbn13, publication_year, publisher, page_count, language, genres, average_rating, ratings_count, cover_image_url)
- [ ] T057 [P] [US2] Add ISBN validator to Book model using pydantic-extra-types.isbn.ISBN per data-model.md
- [ ] T058 [P] [US2] Add additional_authors field to Book model for co-authors/editors
- [ ] T059 [US2] Update Book model tests in parse/tests/unit/test_models.py (test extended fields, ISBN validation)

**Validators (Extend existing)**:

- [ ] T060 [US2] Add ISBN validation to parse/src/validators/data_validator.py (use Pydantic ISBN validator)
- [ ] T061 [US2] Add publication year validation (1000-2100 range per data-model.md)
- [ ] T062 [US2] Add genre normalization (lowercase, deduplication, max 50 genres)

**Parsing (Extend parsers)**:

- [ ] T063 [US2] Extend book parser in parse/src/parsers/book_parser.py to extract ISBN from book page
- [ ] T064 [US2] Extend book parser to extract publication year, publisher, page count
- [ ] T065 [US2] Extend book parser to extract genres/tags from book page
- [ ] T066 [US2] Extend library parser in parse/src/parsers/library_parser.py to extract custom shelves (beyond built-in read/currently-reading/to-read)
- [ ] T067 [US2] Update pagination handler to navigate to individual book pages if needed for metadata
- [ ] T068 [US2] Add extended metadata tests to parse/tests/unit/test_parsers.py (ISBN parsing, genre extraction, edge cases)

**Export (Update formats)**:

- [ ] T069 [US2] Update JSON exporter to include all extended Book fields
- [ ] T070 [US2] Update CSV exporter to include ISBN, publication_year, page_count, genres, custom shelves columns per contracts/csv-export-spec.md
- [ ] T071 [US2] Update exporter tests to validate extended fields in output

**Integration**:

- [ ] T072 [US2] Update scraper orchestrator to call extended metadata parsers
- [ ] T073 [US2] Add logging for extended metadata extraction (ISBN found, genres count, custom shelves)
- [ ] T074 [US2] Handle missing extended metadata gracefully (null values per FR-013)

**Checkpoint**: User Stories 1 AND 2 should both work independently. Users can extract basic + extended metadata.

---

## Phase 5: User Story 3 - Extract Reviews and Reading Dates (Priority: P3)

**Goal**: Capture user reviews, review dates, and reading dates (date_added, date_started, date_finished) for temporal analysis

**Independent Test**: Extract a library with reviews and reading dates, verify this data is captured correctly

### Tests for User Story 3 (TDD - Write tests FIRST) ⚠️

- [ ] T075 [P] [US3] Add review extraction tests to parse/tests/integration/test_scraping_flow.py (review text, rating, date captured)
- [ ] T076 [P] [US3] Add reading dates tests to parse/tests/integration/test_scraping_flow.py (date_added, date_started, date_finished)
- [ ] T077 [P] [US3] Add date validation tests to parse/tests/unit/test_validators.py (ISO 8601 format, date ordering)

### Implementation for User Story 3

**Models (Add Review entity)**:

- [ ] T078 [P] [US3] Create Review model in parse/src/models/review.py (review_text, review_date, likes_count fields)
- [ ] T079 [US3] Add Review model tests in parse/tests/unit/test_models.py (required fields, constraints)
- [ ] T080 [US3] Add review field to UserBookRelation model in parse/src/models/user_book.py (Review | None type)
- [ ] T081 [US3] Add reading date fields to UserBookRelation (date_added, date_started, date_finished with datetime | None)
- [ ] T082 [US3] Add date ordering validation to UserBookRelation (date_started ≤ date_finished per data-model.md)

**Validators (Date handling)**:

- [ ] T083 [US3] Add date parsing to parse/src/validators/data_validator.py (ISO 8601 datetime parsing, timezone handling)
- [ ] T084 [US3] Add date ordering validation (warn if date_added > date_started, error if date_started > date_finished)

**Parsing (Review extraction)**:

- [ ] T085 [US3] Create review parser in parse/src/parsers/review_parser.py to extract review text from user's book page
- [ ] T086 [US3] Extend review parser to extract review date and likes count
- [ ] T087 [US3] Extend library parser in parse/src/parsers/library_parser.py to extract date_added, date_started, date_finished
- [ ] T088 [US3] Handle books without reviews gracefully (null Review object per FR-013)
- [ ] T089 [US3] Strip HTML tags from review text during parsing
- [ ] T090 [US3] Add review/date extraction tests to parse/tests/unit/test_parsers.py

**Export (Update for reviews/dates)**:

- [ ] T091 [US3] Update JSON exporter to include Review objects and reading dates
- [ ] T092 [US3] Update CSV exporter to include review columns (has_review, review_text_preview, review_date, likes_count) per contracts/csv-export-spec.md
- [ ] T093 [US3] Implement review text truncation in CSV exporter (1000 char limit with ellipsis)
- [ ] T094 [US3] Add date_added, date_started, date_finished columns to CSV export
- [ ] T095 [US3] Update exporter tests for review/date fields

**Integration**:

- [ ] T096 [US3] Update scraper orchestrator to extract reviews and dates
- [ ] T097 [US3] Add logging for review extraction (reviews found, dates captured)
- [ ] T098 [US3] Handle empty reviews and missing dates gracefully (null fields)

**Checkpoint**: All user stories should now be independently functional. Complete library scraping with reviews and temporal data.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T099 [P] Add comprehensive error messages with context per Constitution Principle V (source data, operation attempted, expected vs actual)
- [ ] T100 [P] Add CLI help text and usage examples to parse/src/cli/commands.py
- [ ] T101 Add resume capability for interrupted scrapes per SC-004 (checkpoint files, deduplication, no data loss)
- [ ] T102 [P] Add timeout configuration to httpx client (default 30s, configurable via CLI --timeout)
- [ ] T103 [P] Add retry count configuration (default 3, configurable via CLI --retries)
- [ ] T104 [P] Create parse/README.md with installation instructions and basic usage (link to quickstart.md)
- [ ] T105 [P] Add type hints to all public functions and classes (mypy compliance)
- [ ] T106 Validate all tests pass with pytest --cov=parse/src --cov-report=html
- [ ] T107 Validate quickstart.md examples work end-to-end
- [ ] T108 [P] Add private profile detection and user-friendly error per FR-011
- [ ] T111 Validate SC-001: Run scraper against 20+ diverse test profiles (small/large libraries, various privacy settings), verify 95%+ success rate
- [ ] T112 Benchmark SC-002: Measure processing time for 1000-book test library, verify completion within 20 minutes (±20% tolerance: 16-24min acceptable)
- [ ] T113 Validate SC-003: Calculate data completeness metrics on test corpus (target: 100% core fields [title, author, status], 90%+ extended metadata [ISBN, genres, dates])
- [ ] T109 [P] Add HTML structure version detection (warn if Goodreads markup changes)
- [ ] T110 Run full integration test suite against real Goodreads profile (document test account)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends User Story 1 models/scrapers but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds Review model and dates, independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per Constitution Principle III)
- Models before services
- Validators in parallel with models
- Scrapers after models (depend on model structures)
- Exporters after models (depend on model serialization)
- Integration after all components wired

### Parallel Opportunities

- **Setup tasks (T003-T008)**: All marked [P] can run in parallel
- **Foundational directories (T010-T017)**: All marked [P] can run in parallel
- **User Story 1 tests (T020-T024)**: All marked [P] can run in parallel
- **User Story 1 models (T025-T028)**: All marked [P] can run in parallel
- **User Story 1 validators (T030-T031)**: All marked [P] can run in parallel
- **User Story 1 exporters (T040-T041)**: All marked [P] can run in parallel
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write these FIRST):
Task: T020 [P] [US1] Contract test for JSON export format in parse/tests/contract/test_json_contract.py
Task: T021 [P] [US1] Contract test for CSV export format in parse/tests/contract/test_csv_contract.py
Task: T022 [P] [US1] Integration test for basic scraping flow in parse/tests/integration/test_scraping_flow.py
Task: T023 [P] [US1] Integration test for pagination in parse/tests/integration/test_pagination.py
Task: T024 [P] [US1] Integration test for error handling in parse/tests/integration/test_error_handling.py

# After tests fail, launch all models for User Story 1 together:
Task: T025 [P] [US1] Create Book model in parse/src/models/book.py
Task: T026 [P] [US1] Create Shelf model in parse/src/models/shelf.py
Task: T027 [P] [US1] Create UserBookRelation model in parse/src/models/user_book.py
Task: T028 [P] [US1] Create Library model in parse/src/models/library.py

# Launch validators in parallel:
Task: T030 [P] [US1] URL validator in parse/src/validators/url_validator.py
Task: T031 [P] [US1] Data validator in parse/src/validators/data_validator.py

# Launch exporters in parallel:
Task: T040 [P] [US1] JSON exporter in parse/src/exporters/json_exporter.py
Task: T041 [P] [US1] CSV exporter in parse/src/exporters/csv_exporter.py
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T019) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T020-T051)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - this is a functional scraper with JSON/CSV export

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (extended metadata)
4. Add User Story 3 → Test independently → Deploy/Demo (reviews & dates)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T019)
2. Once Foundational is done:
   - Developer A: User Story 1 (T020-T051)
   - Developer B: User Story 2 (T052-T073) - can start models immediately
   - Developer C: User Story 3 (T074-T097) - can start Review model immediately
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is NON-NEGOTIABLE per Constitution Principle III**: Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: Data-first (models first), TDD (tests first), observability (structured logging), validation (Pydantic)

---

## Task Count Summary

- **Phase 1 (Setup)**: 8 tasks (T001-T008) ✅ COMPLETE
- **Phase 2 (Foundational)**: 12 tasks (T009-T019, T010b) ✅ COMPLETE
- **Phase 3 (User Story 1)**: 33 tasks (T020-T052)
- **Phase 4 (User Story 2)**: 22 tasks (T053-T074)
- **Phase 5 (User Story 3)**: 24 tasks (T075-T098)
- **Phase 6 (Polish)**: 15 tasks (T099-T110, T111-T113)

**Total**: 114 tasks (20 complete, 94 remaining)

**Parallel Opportunities**: 35+ tasks marked [P] can run in parallel within their phases

**MVP Scope**: Phases 1-3 (53 tasks total, 20 complete) deliver functional scraper with basic data + JSON/CSV export

**Structure Update**: Multi-component monorepo architecture with parsers separated from scrapers:
- `parse/src/parsers/` - HTML parsing logic (BeautifulSoup utilities)
- `parse/src/scrapers/` - Scraping orchestration (requests, pagination, rate limiting)
- `ui/` - React UI component (future)
- `api/` - Node.js API component (future)
