# CopperCore ERP - Database Migrations

This directory contains generated SQL migrations from the TypeScript schema definitions.

## Migration Process

1. **Define Schema**: Edit files in `/db/schema/` using Drizzle ORM syntax
2. **Generate Migration**: Run `pnpm db:generate` to create SQL migration files
3. **Apply Migration**: Run `pnpm db:apply` to execute migrations against database
4. **Seed Data**: Run `pnpm db:seed` to populate with test data

## Migration Files

Generated migration files follow the naming pattern:
- `0001_initial_setup.sql`
- `0002_add_product_families.sql` 
- `0003_add_work_orders.sql`
- etc.

Each migration is atomic and includes:
- DDL statements (CREATE TABLE, ALTER TABLE, etc.)
- RLS policy definitions
- Helper function definitions
- Trigger definitions
- Index creation

## Manual Migrations

For complex migrations that can't be auto-generated:
1. Create file manually in this directory
2. Follow naming convention: `XXXX_description.sql`
3. Include both UP and DOWN migrations where possible
4. Test on development database first

Migration files are applied in alphabetical order by filename.