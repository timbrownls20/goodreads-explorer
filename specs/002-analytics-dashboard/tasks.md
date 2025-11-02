# Tasks: Analytics Dashboard

**Input**: Design documents from `/specs/002-analytics-dashboard/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/

**Tests**: Tests are NOT explicitly requested in the spec. Manual testing with sample datasets is specified instead.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a full-stack web application with:
- **Frontend**: `dashboard/frontend/src/`
- **Backend**: `dashboard/backend/src/`
- **Database**: `dashboard/database/`
- **Docker**: `dashboard/` root level

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Docker Compose orchestration

- [ ] T001 Create dashboard/ directory structure with frontend/, backend/, database/ subdirectories
- [ ] T002 Create docker-compose.yml in dashboard/ root with PostgreSQL, backend, frontend services
- [ ] T003 [P] Create .env.example in dashboard/ with database, backend, frontend configuration variables
- [ ] T004 [P] Create dashboard/README.md with deployment instructions from quickstart.md
- [ ] T005 [P] Create .dockerignore files in dashboard/frontend/ and dashboard/backend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [ ] T006 Initialize NestJS project in dashboard/backend/ with TypeScript, TypeORM, class-validator
- [ ] T007 Create dashboard/backend/tsconfig.json with strict TypeScript settings
- [ ] T008 Create dashboard/backend/nest-cli.json for NestJS CLI configuration
- [ ] T009 Create dashboard/backend/src/main.ts as NestJS application entry point
- [ ] T010 Create dashboard/backend/src/app.module.ts as root module with TypeORM, config imports
- [ ] T011 Create dashboard/backend/src/config/database.config.ts for PostgreSQL connection settings
- [ ] T012 [P] Create dashboard/backend/src/utils/logger.ts implementing Winston structured logging
- [ ] T013 Create dashboard/backend/src/entities/user.entity.ts with User model (session_id, created_at)
- [ ] T014 Create dashboard/backend/src/entities/library.entity.ts with Library model (user_id, name, folder_path)
- [ ] T015 Create dashboard/backend/src/entities/book.entity.ts with Book model (all fields from data-model.md)
- [ ] T016 Generate TypeORM migration for initial schema in dashboard/backend/src/migrations/
- [ ] T017 Create dashboard/backend/src/controllers/health.controller.ts with GET /api/health endpoint
- [ ] T018 Create dashboard/backend/Dockerfile with Node.js 20-alpine base, production build
- [ ] T019 [P] Create dashboard/backend/.env.example with DATABASE_URL, PORT, NODE_ENV

### Frontend Foundation

- [ ] T020 Initialize React + TypeScript + Vite project in dashboard/frontend/
- [ ] T021 Create dashboard/frontend/tsconfig.json with strict TypeScript settings
- [ ] T022 Create dashboard/frontend/vite.config.ts with proxy to backend API
- [ ] T023 Create dashboard/frontend/src/main.tsx as React application entry point
- [ ] T024 Create dashboard/frontend/src/App.tsx as root component with routing structure
- [ ] T025 [P] Install react-chartjs-2, chart.js, axios dependencies in dashboard/frontend/package.json
- [ ] T026 [P] Create dashboard/frontend/src/services/api.ts with Axios client configuration
- [ ] T027 [P] Create dashboard/frontend/src/types/Book.ts interface matching backend Book entity
- [ ] T028 [P] Create dashboard/frontend/src/types/Filter.ts interface for filter state
- [ ] T029 [P] Create dashboard/frontend/src/types/Analytics.ts interface for API responses
- [ ] T030 Create dashboard/frontend/Dockerfile with multi-stage build (Vite → Nginx)
- [ ] T031 [P] Create dashboard/frontend/nginx.conf for serving React SPA

### Database Foundation

- [ ] T032 Create dashboard/database/init.sql with optional schema initialization
- [ ] T033 [P] Create dashboard/database/seed_data/small-10.json with 10 sample books
- [ ] T034 [P] Create dashboard/database/seed_data/medium-500.json with 500 sample books
- [ ] T035 [P] Create dashboard/database/seed_data/large-2000.json with 2000 sample books

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Reading Summary Statistics (Priority: P1) 🎯 MVP

**Goal**: Display summary statistics (total books, average rating, reading pace, year-over-year comparison) from uploaded library data

**Independent Test**: Load a library dataset (using small-10.json or medium-500.json) and verify dashboard displays accurate counts, averages, and year-to-date statistics

### Backend for User Story 1

- [ ] T036 [P] [US1] Create dashboard/backend/src/dto/book.dto.ts with CreateBookDto for upload validation
- [ ] T037 [P] [US1] Create dashboard/backend/src/dto/upload.dto.ts with UploadResponseDto for upload results
- [ ] T038 [P] [US1] Create dashboard/backend/src/dto/analytics.dto.ts with AnalyticsSummaryDto response schema
- [ ] T039 [US1] Create dashboard/backend/src/services/file-parser.service.ts for JSON parsing and validation
- [ ] T040 [US1] Create dashboard/backend/src/services/analytics-engine.service.ts for summary statistics calculation
- [ ] T041 [US1] Create dashboard/backend/src/controllers/library.controller.ts with POST /api/library/upload endpoint using Multer
- [ ] T042 [US1] Create dashboard/backend/src/controllers/analytics.controller.ts with GET /api/analytics/summary endpoint
- [ ] T043 [US1] Add Swagger decorators to library.controller.ts and analytics.controller.ts for API documentation
- [ ] T044 [US1] Implement upload processing workflow: parse JSON → validate DTOs → save to database in library.controller.ts
- [ ] T045 [US1] Implement summary calculation: aggregate counts, averages, reading pace in analytics-engine.service.ts
- [ ] T046 [US1] Add error handling for invalid JSON, missing fields, database failures in file-parser.service.ts
- [ ] T047 [US1] Add structured logging for upload progress and analytics queries in analytics.controller.ts

### Frontend for User Story 1

- [ ] T048 [P] [US1] Create dashboard/frontend/src/services/library.ts with uploadLibrary API function
- [ ] T049 [P] [US1] Create dashboard/frontend/src/services/analytics.ts with getSummary API function
- [ ] T050 [P] [US1] Create dashboard/frontend/src/hooks/useLibrary.ts for library upload state management
- [ ] T051 [P] [US1] Create dashboard/frontend/src/hooks/useAnalytics.ts for analytics data fetching
- [ ] T052 [US1] Create dashboard/frontend/src/components/UploadManager.tsx for file upload UI with progress indicator
- [ ] T053 [P] [US1] Create dashboard/frontend/src/components/MetricCard.tsx for displaying individual statistics
- [ ] T054 [US1] Create dashboard/frontend/src/components/Dashboard.tsx as main layout aggregating MetricCards
- [ ] T055 [US1] Implement upload flow in UploadManager.tsx: file selection → upload → display results
- [ ] T056 [US1] Implement summary display in Dashboard.tsx: fetch summary → render MetricCards with stats
- [ ] T057 [US1] Add loading states and error handling in Dashboard.tsx for API failures
- [ ] T058 [P] [US1] Create dashboard/frontend/src/utils/dateFormat.ts for date formatting utilities

**Checkpoint**: User Story 1 complete - Upload library and view summary statistics

---

## Phase 4: User Story 2 - Explore Reading Trends Over Time (Priority: P2)

**Goal**: Visualize reading volume and rating trends over months/years with interactive charts

**Independent Test**: Load a multi-year library dataset (medium-500.json or large-2000.json) and verify trend charts accurately show reading volume by month/year and rating trends

### Backend for User Story 2

- [ ] T059 [P] [US2] Create dashboard/backend/src/dto/trends.dto.ts with TrendDataDto response schema
- [ ] T060 [US2] Extend analytics-engine.service.ts with getTrends method for temporal aggregations
- [ ] T061 [US2] Add GET /api/analytics/trends endpoint to analytics.controller.ts with FilterRequestDto query params
- [ ] T062 [US2] Implement reading volume aggregation by month/quarter/year in analytics-engine.service.ts
- [ ] T063 [US2] Implement rating trend calculation (average rating per period) in analytics-engine.service.ts
- [ ] T064 [US2] Add database query optimization with indexes on date_finished for analytics-engine.service.ts
- [ ] T065 [US2] Add structured logging for trends queries in analytics.controller.ts

### Frontend for User Story 2

- [ ] T066 [P] [US2] Create dashboard/frontend/src/services/analytics.ts getTrends API function
- [ ] T067 [P] [US2] Create dashboard/frontend/src/hooks/useTrends.ts for trends data fetching
- [ ] T068 [P] [US2] Create dashboard/frontend/src/utils/chartConfig.ts for Chart.js configuration
- [ ] T069 [P] [US2] Create dashboard/frontend/src/components/charts/LineChart.tsx wrapping react-chartjs-2
- [ ] T070 [US2] Create dashboard/frontend/src/components/charts/ReadingVolumeChart.tsx for reading volume trends
- [ ] T071 [US2] Create dashboard/frontend/src/components/charts/RatingTrendChart.tsx for rating trends
- [ ] T072 [US2] Integrate LineChart components into Dashboard.tsx below summary statistics
- [ ] T073 [US2] Implement time granularity toggle (monthly/quarterly/yearly) in ReadingVolumeChart.tsx
- [ ] T074 [US2] Enable Chart.js data decimation plugin for large datasets in chartConfig.ts
- [ ] T075 [US2] Add loading skeletons for charts in Dashboard.tsx

**Checkpoint**: User Story 2 complete - Trend visualizations working independently

---

## Phase 5: User Story 3 - Analyze Reading by Categories (Priority: P2)

**Goal**: Break down reading data by genres, authors, publication decades, and page count ranges

**Independent Test**: Load a diverse library dataset and verify category breakdowns accurately group books with counts, percentages, and average ratings per category

### Backend for User Story 3

- [ ] T076 [P] [US3] Create dashboard/backend/src/dto/categories.dto.ts with CategoryDataDto response schema
- [ ] T077 [US3] Extend analytics-engine.service.ts with getCategories method for categorical aggregations
- [ ] T078 [US3] Add GET /api/analytics/categories endpoint to analytics.controller.ts
- [ ] T079 [US3] Implement genre breakdown aggregation using PostgreSQL JSONB queries in analytics-engine.service.ts
- [ ] T080 [US3] Implement author analysis aggregation (count, pages, avg rating) in analytics-engine.service.ts
- [ ] T081 [US3] Implement publication decade categorization in analytics-engine.service.ts
- [ ] T082 [US3] Implement page count range categorization (short/medium/long) in analytics-engine.service.ts
- [ ] T083 [US3] Add GIN indexes on genres and shelves JSONB columns for performance
- [ ] T084 [US3] Add structured logging for category queries in analytics.controller.ts

### Frontend for User Story 3

- [ ] T085 [P] [US3] Create dashboard/frontend/src/services/analytics.ts getCategories API function
- [ ] T086 [P] [US3] Create dashboard/frontend/src/hooks/useCategories.ts for categories data fetching
- [ ] T087 [P] [US3] Create dashboard/frontend/src/components/charts/BarChart.tsx wrapping react-chartjs-2
- [ ] T088 [P] [US3] Create dashboard/frontend/src/components/charts/PieChart.tsx wrapping react-chartjs-2
- [ ] T089 [US3] Create dashboard/frontend/src/components/GenreBreakdown.tsx using PieChart for top genres
- [ ] T090 [US3] Create dashboard/frontend/src/components/AuthorAnalysis.tsx using BarChart for top authors
- [ ] T091 [US3] Create dashboard/frontend/src/components/PublicationDecades.tsx using BarChart for decades
- [ ] T092 [US3] Create dashboard/frontend/src/components/PageCountRanges.tsx for length preferences
- [ ] T093 [US3] Integrate category components into Dashboard.tsx with tabs or sections
- [ ] T094 [US3] Add sorting options (by count, rating, name) to GenreBreakdown.tsx and AuthorAnalysis.tsx
- [ ] T095 [US3] Limit category displays to top 20 items with "show more" option

**Checkpoint**: User Story 3 complete - Category analysis working independently

---

## Phase 6: User Story 4 - Filter and Drill Down (Priority: P3)

**Goal**: Apply filters (date ranges, rating ranges, shelves, status) to all dashboard views and update visualizations dynamically

**Independent Test**: Apply various filter combinations and verify all metrics and visualizations update to reflect only the filtered subset

### Backend for User Story 4

- [ ] T096 [P] [US4] Create dashboard/backend/src/dto/filter.dto.ts with FilterRequestDto for query parameters
- [ ] T097 [US4] Update analytics.controller.ts endpoints to accept FilterRequestDto query params
- [ ] T098 [US4] Implement filter application in analytics-engine.service.ts using TypeORM QueryBuilder
- [ ] T099 [US4] Add date range filtering (dateStart, dateEnd) in analytics-engine.service.ts
- [ ] T100 [US4] Add rating range filtering (ratingMin, ratingMax) in analytics-engine.service.ts
- [ ] T101 [US4] Add status filtering (read, currently-reading, to-read) in analytics-engine.service.ts
- [ ] T102 [US4] Add genre filtering (multiple genres with OR logic) in analytics-engine.service.ts
- [ ] T103 [US4] Add shelf filtering (multiple shelves with OR logic) in analytics-engine.service.ts
- [ ] T104 [US4] Return filteredCount and unfilteredCount in all analytics DTOs
- [ ] T105 [US4] Add structured logging for filter parameters in analytics.controller.ts

### Frontend for User Story 4

- [ ] T106 [P] [US4] Create dashboard/frontend/src/hooks/useFilters.ts for filter state management
- [ ] T107 [P] [US4] Create dashboard/frontend/src/components/FilterPanel.tsx for filter UI controls
- [ ] T108 [US4] Implement date range filter controls (custom dates, presets) in FilterPanel.tsx
- [ ] T109 [US4] Implement rating range filter controls (min/max sliders) in FilterPanel.tsx
- [ ] T110 [US4] Implement status filter dropdown in FilterPanel.tsx
- [ ] T111 [US4] Implement genre multi-select filter in FilterPanel.tsx
- [ ] T112 [US4] Implement shelf multi-select filter in FilterPanel.tsx
- [ ] T113 [US4] Add "Reset Filters" button to FilterPanel.tsx
- [ ] T114 [US4] Integrate FilterPanel.tsx into Dashboard.tsx as left sidebar
- [ ] T115 [US4] Update useAnalytics.ts, useTrends.ts, useCategories.ts to pass filters to API calls
- [ ] T116 [US4] Debounce filter changes (300ms) before triggering API calls
- [ ] T117 [US4] Display filtered book count in Dashboard.tsx (e.g., "Showing 45 of 347 books")
- [ ] T118 [US4] Show empty state when filters produce no results

**Checkpoint**: User Story 4 complete - Filtering working across all visualizations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T119 [P] Add Swagger UI configuration to backend/src/main.ts for /api/docs endpoint
- [ ] T120 [P] Create dashboard/scripts/run-dev.sh for local development workflow
- [ ] T121 [P] Create dashboard/scripts/run-tests.sh for running backend Jest tests
- [ ] T122 [P] Create dashboard/scripts/seed-db.sh for loading test datasets
- [ ] T123 Add CORS configuration in backend/src/main.ts for frontend origin
- [ ] T124 Add ValidationPipe globally in backend/src/main.ts for DTO validation
- [ ] T125 Add global exception filter in backend/src/main.ts for error formatting
- [ ] T126 Optimize frontend bundle size: enable code splitting in vite.config.ts
- [ ] T127 Optimize frontend bundle size: lazy load chart components with React.lazy()
- [ ] T128 Add React.memo() to expensive components (Dashboard.tsx, charts)
- [ ] T129 Add useMemo/useCallback optimizations to hooks (useAnalytics.ts, useTrends.ts)
- [ ] T130 Test full Docker Compose workflow with all 3 services
- [ ] T131 Test upload with small-10.json, medium-500.json, large-2000.json datasets
- [ ] T132 Verify performance: upload 2000 books in <3 seconds (SC-001)
- [ ] T133 Verify performance: analytics API <500ms response time (FR-029)
- [ ] T134 Verify performance: filter updates <1 second (SC-004)
- [ ] T135 Manual browser testing across Chrome, Firefox, Safari, Edge
- [ ] T136 Update dashboard/README.md with final deployment instructions
- [ ] T137 [P] Add security headers in frontend nginx.conf
- [ ] T138 [P] Add rate limiting middleware in backend/src/main.ts
- [ ] T139 Run quickstart.md validation end-to-end with fresh Docker setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - Can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) completion - Can run in parallel with US1/US2
- **User Story 4 (Phase 6)**: Depends on User Stories 1, 2, 3 (needs visualizations to filter)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: ✅ Independent - Can start after Foundational, no dependencies on other stories
- **User Story 2 (P2)**: ✅ Independent - Can start after Foundational, works with data from US1
- **User Story 3 (P2)**: ✅ Independent - Can start after Foundational, works with data from US1
- **User Story 4 (P3)**: ⚠️ Depends on US1, US2, US3 - Needs visualizations to filter

### Within Each User Story

- Backend tasks can run in parallel with frontend tasks
- Backend: DTOs before services, services before controllers
- Frontend: Types before services, services before hooks, hooks before components
- Core components before integration into Dashboard.tsx

### Parallel Opportunities

**Setup (Phase 1)**:
- T003, T004, T005 can run in parallel (different files)

**Foundational (Phase 2)**:
- Backend: T012, T013, T014, T015, T019 can run in parallel (different entity files)
- Frontend: T025, T026, T027, T028, T029, T031 can run in parallel (different files)
- Database: T033, T034, T035 can run in parallel (different seed files)

**User Story 1 (Phase 3)**:
- Backend: T036, T037, T038 can run in parallel (different DTOs)
- Frontend: T048, T049, T050, T051, T053, T058 can run in parallel (different files)

**User Story 2 (Phase 4)**:
- Frontend: T066, T067, T068, T069 can run in parallel

**User Story 3 (Phase 5)**:
- Backend: T076 standalone
- Frontend: T085, T086, T087, T088 can run in parallel

**User Story 4 (Phase 6)**:
- Frontend: T106, T107 can run in parallel

**Polish (Phase 7)**:
- T119, T120, T121, T122, T137, T138 can run in parallel

**Cross-Story Parallelization**:
- Once Foundational (Phase 2) is complete, User Stories 1, 2, and 3 can be developed in parallel by different team members

---

## Parallel Example: User Story 1 - Backend

```bash
# Launch all DTOs for User Story 1 together:
Task T036: "Create dashboard/backend/src/dto/book.dto.ts with CreateBookDto"
Task T037: "Create dashboard/backend/src/dto/upload.dto.ts with UploadResponseDto"
Task T038: "Create dashboard/backend/src/dto/analytics.dto.ts with AnalyticsSummaryDto"

# After DTOs complete, launch services:
Task T039: "Create dashboard/backend/src/services/file-parser.service.ts"
Task T040: "Create dashboard/backend/src/services/analytics-engine.service.ts"
```

---

## Parallel Example: User Story 1 - Frontend

```bash
# Launch all API services for User Story 1 together:
Task T048: "Create dashboard/frontend/src/services/library.ts with uploadLibrary"
Task T049: "Create dashboard/frontend/src/services/analytics.ts with getSummary"

# Launch all hooks for User Story 1 together:
Task T050: "Create dashboard/frontend/src/hooks/useLibrary.ts"
Task T051: "Create dashboard/frontend/src/hooks/useAnalytics.ts"

# Launch core components:
Task T053: "Create dashboard/frontend/src/components/MetricCard.tsx"
Task T058: "Create dashboard/frontend/src/utils/dateFormat.ts"
```

---

## Parallel Example: Cross-Story Development

```bash
# After Foundational Phase (Phase 2) completes, teams can work in parallel:

Team A (Priority 1):
  Complete User Story 1 (Phase 3) → MVP deployment

Team B (Priority 2):
  Complete User Story 2 (Phase 4) → Trends feature

Team C (Priority 2):
  Complete User Story 3 (Phase 5) → Categories feature

# After US1, US2, US3 complete:
Team A+B+C:
  Complete User Story 4 (Phase 6) → Filtering across all visualizations
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T035) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T036-T058)
4. Complete minimal polish for deployment (T119, T123, T124, T125, T130)
5. **STOP and VALIDATE**: Test US1 independently with sample datasets
6. Deploy/demo if ready

### Incremental Delivery

1. **Foundation** → Complete Setup + Foundational (Phase 1 + Phase 2)
2. **MVP** → Add User Story 1 (Phase 3) → Test independently → Deploy/Demo
3. **Trends** → Add User Story 2 (Phase 4) → Test independently → Deploy/Demo
4. **Categories** → Add User Story 3 (Phase 5) → Test independently → Deploy/Demo
5. **Filtering** → Add User Story 4 (Phase 6) → Test independently → Deploy/Demo
6. **Polish** → Complete Phase 7 → Final production deployment

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phase 1 + Phase 2)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T036-T058) - Priority 1
   - **Developer B**: User Story 2 (T059-T075) - Priority 2
   - **Developer C**: User Story 3 (T076-T095) - Priority 2
3. After US1, US2, US3 complete:
   - **Team together**: User Story 4 (T096-T118) - Requires all visualizations
4. **Team together**: Polish & deployment (Phase 7)

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **[Story] label** = Maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Verify Docker Compose startup before implementing user stories
- Test with all 3 sample datasets: small-10.json, medium-500.json, large-2000.json
- Monitor performance targets at each checkpoint

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 30 tasks (Backend: 14, Frontend: 12, Database: 4)
- **Phase 3 (User Story 1 - P1)**: 23 tasks (Backend: 12, Frontend: 11)
- **Phase 4 (User Story 2 - P2)**: 17 tasks (Backend: 7, Frontend: 10)
- **Phase 5 (User Story 3 - P2)**: 20 tasks (Backend: 9, Frontend: 11)
- **Phase 6 (User Story 4 - P3)**: 23 tasks (Backend: 10, Frontend: 13)
- **Phase 7 (Polish)**: 21 tasks
- **Total**: 139 tasks

**MVP Scope** (Recommended first delivery):
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 30 tasks
- Phase 3 (User Story 1): 23 tasks
- Minimal Polish: 5 tasks (T119, T123, T124, T125, T130)
- **MVP Total**: 63 tasks
