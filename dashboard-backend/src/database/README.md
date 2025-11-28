# Database Migrations

This project uses **Sequelize CLI** for database migrations.

## Setup

Migrations are already configured. The system uses:
- `.sequelizerc` - Configuration file pointing to migration directories
- `src/database/config.js` - Database connection configuration
- `src/database/migrations/` - Migration files

## Available Commands

```bash
# Check migration status
pnpm migration:status

# Run pending migrations
pnpm migration:run

# Undo last migration
pnpm migration:undo

# Undo all migrations (⚠️  DANGER: Drops all tables)
pnpm migration:undo:all

# Generate a new migration file
pnpm migration:generate -- my-migration-name
```

## Creating a New Migration

1. Generate a migration file:
   ```bash
   pnpm migration:generate -- add-new-column
   ```

2. Edit the generated file in `src/database/migrations/`

3. Implement the `up` and `down` functions:
   ```javascript
   module.exports = {
     async up(queryInterface, Sequelize) {
       // Apply changes
       await queryInterface.addColumn('table_name', 'column_name', {
         type: Sequelize.STRING,
         allowNull: true,
       });
     },

     async down(queryInterface, Sequelize) {
       // Revert changes
       await queryInterface.removeColumn('table_name', 'column_name');
     },
   };
   ```

4. Run the migration:
   ```bash
   pnpm migration:run
   ```

## Migration History

### 20251110000001-create-initial-schema.js
- **Status**: Marked as complete (schema created by Sequelize sync)
- Created all initial tables:
  - `libraries` - Library metadata
  - `books` - Book records with all metadata
  - `genres`, `shelves`, `literary_awards` - Normalized category tables
  - `book_genres`, `book_shelves`, `book_literary_awards` - Junction tables

### 20251110000002-add-original-json-column.js
- **Status**: ✅ Applied
- Added `original_json` (JSONB) column to `books` table
- Stores raw JSON from import files for auditing and re-processing

## Best Practices

1. **Always test migrations** in development before running in production
2. **Write reversible migrations** - Implement both `up` and `down`
3. **Use transactions** for complex migrations:
   ```javascript
   await queryInterface.sequelize.transaction(async (transaction) => {
     await queryInterface.addColumn('table', 'column', {...}, { transaction });
     await queryInterface.addIndex('table', ['column'], { transaction });
   });
   ```

4. **Never modify existing migrations** - Create new ones instead
5. **Check migration status** before deploying:
   ```bash
   pnpm migration:status
   ```

## Troubleshooting

### Migration fails with "relation already exists"
This means the table/column already exists. Either:
- Mark the migration as complete manually
- Modify the migration to check if the object exists first

### How to reset the database
```bash
# ⚠️  WARNING: This drops all data!
pnpm migration:undo:all
pnpm migration:run
```

### How to roll back one migration
```bash
pnpm migration:undo
```

## Production Deployment

In production, migrations run automatically when the application starts if `NODE_ENV=production`. Alternatively, run them manually before starting:

```bash
NODE_ENV=production pnpm migration:run
```

## Environment Variables

Required environment variables (set in `.env`):
- `POSTGRES_HOST` - Database host
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name
