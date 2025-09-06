#!/bin/bash
# CopperCore Migration Runner
# Runs SQL migrations in order against target database

set -e

# Configuration
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"
POLICIES_DIR="$(cd "$(dirname "$0")/../policies" && pwd)"

# Default to TEST_DB_URL if no DATABASE_URL provided
DB_URL="${DATABASE_URL:-${TEST_DB_URL}}"

if [ -z "$DB_URL" ]; then
  echo "❌ Error: DATABASE_URL or TEST_DB_URL must be set"
  echo "Example: DATABASE_URL=postgresql://user:pass@localhost:5432/coppercore_dev"
  exit 1
fi

echo "🔄 Running migrations against database..."
echo "📁 Migrations directory: $MIGRATIONS_DIR"
echo "🔗 Database: ${DB_URL%%\?*}" # Hide query params

# Function to run a single migration
run_migration() {
  local file="$1"
  local filename=$(basename "$file")
  
  echo "⚙️  Running migration: $filename"
  
  if psql "$DB_URL" -f "$file" -v ON_ERROR_STOP=1 > /dev/null; then
    echo "✅ Migration completed: $filename"
  else
    echo "❌ Migration failed: $filename"
    exit 1
  fi
}

# Run base schema migrations first
echo "📋 Running base migrations..."
for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$migration" ]; then
    run_migration "$migration"
  fi
done

# Run RLS policies
echo "🔒 Applying RLS policies..."
for policy in "$POLICIES_DIR"/*.sql; do
  if [ -f "$policy" ]; then
    run_migration "$policy"
  fi
done

echo "🎉 All migrations completed successfully!"

# Verify critical tables exist
echo "🔍 Verifying database structure..."
psql "$DB_URL" -c "
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
AND table_name IN ('factories', 'users', 'work_orders', 'packing_units', 'dispatch_notes', 'grns')
ORDER BY table_name;
" -t

echo "✨ Migration verification complete!"