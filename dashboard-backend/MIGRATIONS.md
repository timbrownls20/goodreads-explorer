# Database Migration System

## ✅ Implementation Complete

Sequelize CLI migration system has been successfully implemented for the goodreads-explorer dashboard backend.

## What Was Done

### 1. Installed Dependencies
- `sequelize-cli` - Migration management tool
- `dotenv` - Environment variable management

### 2. Configuration Files Created
- `.sequelizerc` - Points to migration directories
- `src/database/config.js` - Database connection config for CLI
- Disabled `synchronize` in Sequelize config (now uses migrations)

### 3. Migration Files Created

#### 20251110000001-create-initial-schema.js
Complete initial database schema with all tables:
- `libraries` - Library metadata
- `books` - Book records with full metadata
- `genres`, `shelves`, `literary_awards` - Normalized categories
- `book_genres`, `book_shelves`, `book_literary_awards` - Junction tables
- All indexes and foreign key constraints

**Status**: Marked as complete (schema existed from Sequelize sync)

#### 20251110000002-add-original-json-column.js
Adds `original_json` JSONB column to `books` table for storing raw import data.

**Status**: ✅ Applied successfully

### 4. NPM Scripts Added
```json
{
  "migration:generate": "sequelize-cli migration:generate --name",
  "migration:run": "sequelize-cli db:migrate",
  "migration:undo": "sequelize-cli db:migrate:undo",
  "migration:undo:all": "sequelize-cli db:migrate:undo:all",
  "migration:status": "sequelize-cli db:migrate:status"
}
```

## Current State

### Database Schema
All tables exist with the following structure:
- ✅ `libraries` (id, name, folder_path, last_uploaded_at)
- ✅ `books` (id, library_id, title, author, status, rating, isbn, publication_year, pages, publisher, setting, cover_image_url, goodreads_url, dates, review, **original_json**)
- ✅ `genres` (id, name, slug)
- ✅ `shelves` (id, name, slug)
- ✅ `literary_awards` (id, name, slug)
- ✅ Junction tables with proper foreign keys

### Migration Status
```bash
$ pnpm migration:status
up 20251110000001-create-initial-schema.js
up 20251110000002-add-original-json-column.js
```

## Usage

### Check Migration Status
```bash
pnpm migration:status
```

### Run Pending Migrations
```bash
pnpm migration:run
```

### Create New Migration
```bash
pnpm migration:generate -- add-new-feature
# Edit the generated file in src/database/migrations/
pnpm migration:run
```

### Rollback Last Migration
```bash
pnpm migration:undo
```

## Benefits

1. **Version Control**: Database schema changes tracked in git
2. **Rollback Capability**: Can undo migrations if needed
3. **Production Safety**: Controlled schema changes
4. **Team Collaboration**: Consistent schema across environments
5. **Audit Trail**: Clear history of all database changes

## Next Steps

When you make schema changes:
1. Generate a new migration: `pnpm migration:generate -- descriptive-name`
2. Edit the migration file to implement `up` and `down` functions
3. Test in development: `pnpm migration:run`
4. Commit the migration file to git
5. Run in production: `NODE_ENV=production pnpm migration:run`

## Documentation

Full documentation available in: `src/database/README.md`
