# Database Migrations

This directory contains SQL migration files for the CopperCore ERP database schema.

## Quick Start

### Option 1: Automated Migration (Recommended for Development)

```bash
# Generate a new migration
pnpm db:generate "add inventory table" table

# Apply all pending migrations 
pnpm db:migrate

# Verify migrations
pnpm db:verify
```

### Option 2: Manual Execution (For Production/Read-only DB)

If your database is in read-only mode or you prefer manual control:

1. **Run the consolidated migration file:**
   - Copy the contents of `consolidated.sql` 
   - Paste into your Supabase SQL Editor
   - Execute the entire script

2. **Or apply individual migrations:**
   - Run each migration file (001-011) in order
   - Execute in Supabase dashboard SQL Editor

## Available Commands

```bash
# Migration Generation
pnpm db:generate "migration name"              # Create custom migration
pnpm db:generate "add users table" table       # Create table with RLS
pnpm db:generate "create helper" function      # Create function
pnpm db:generate "add indexes" index          # Add performance indexes
pnpm db:generate --help                        # Show available templates

# Migration Execution
pnpm db:migrate                                # Apply pending migrations
pnpm db:dry-run                               # Show what would be applied
pnpm db:verify                                # Verify applied migrations integrity
pnpm db:rollback                              # Rollback last migration (DANGEROUS)

# Database Operations
pnpm db:seed                                  # Seed test data
pnpm db:seed:clean                           # Clean seed data
pnpm db:reset                                # Rollback and re-apply (DANGEROUS)
```

## File Structure

- `consolidated.sql` - All migrations combined for manual execution
- `000_*` - Reserved for setup/cleanup migrations
- `001-011` - Core authentication and factory scoping system
- `012+` - Application-specific features (generated via db:generate)

## Migration Order

Migrations must be applied in numerical order. Each file builds on the previous ones.

### Core System (001-011)

1. **001_enable_citext_extension.sql** - Enable case-insensitive text support
2. **002_create_user_role_enum.sql** - Define user role enumeration (CEO, Director, FM, FW, Office)
3. **003_create_factories_table.sql** - Factory entities with triggers and constraints
4. **004_create_users_table.sql** - User accounts with citext usernames and role enum
5. **005_create_user_factory_links_table.sql** - Many-to-many user-factory assignments
6. **006_create_user_settings_table.sql** - User preferences and dynamic factory selection
7. **007_add_auth_sync_triggers.sql** - Sync with Supabase auth.users table
8. **008_create_auth_helper_functions.sql** - JWT extraction and context functions
9. **009_create_rls_policies.sql** - Row-level security policies for factory scoping
10. **010_add_performance_indexes.sql** - Query optimization indexes
11. **011_create_factory_switch_function.sql** - Factory switching with audit events

## Architecture Notes

### Factory Scoping
- **Global Roles:** CEO and Director can access all factories
- **Scoped Roles:** FM, FW, and Office are limited to assigned factories
- **Dynamic Context:** Users select active factory via `user_settings.selected_factory_id`

### Row-Level Security (RLS)
- Enabled on all core tables
- Policies enforce factory boundaries automatically
- Helper functions provide JWT-based context (`jwt_user_id()`, `current_factory()`)

### Authentication Integration
- Compatible with Supabase Auth or custom JWT systems
- Auto-sync triggers between `auth.users` and `public.users`
- Service client required for migration operations

## Troubleshooting

### Read-Only Database Error
If you get "read-only transaction" errors:
1. Use the `consolidated.sql` file for manual execution
2. Run individual migration files in Supabase SQL Editor
3. Check your Supabase service role permissions

### Missing migration_history Table
If migrations fail with "table not found":
1. Run the SQL shown in the error message to create the table
2. Or execute the `consolidated.sql` file which includes table creation

### RLS Policy Conflicts
If you get RLS-related errors:
1. Ensure helper functions are applied first (migration 008)
2. Check that `auth.uid()` function exists in your Supabase instance
3. Verify JWT tokens contain proper user identification

## Security Considerations

- All tables use UUID primary keys
- RLS policies enforce factory isolation
- Audit timestamps on all core tables
- Factory switching events are logged
- Service role key required for administrative operations