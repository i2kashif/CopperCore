#!/bin/bash
# CopperCore Seed Data Runner
# Loads development seed data

set -e

SEED_DIR="$(cd "$(dirname "$0")/../seed" && pwd)"
DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ Error: DATABASE_URL must be set"
  exit 1
fi

echo "🌱 Loading seed data..."
echo "📁 Seed directory: $SEED_DIR"
echo "🔗 Database: ${DB_URL%%\?*}"

for seed_file in "$SEED_DIR"/*.sql; do
  if [ -f "$seed_file" ]; then
    filename=$(basename "$seed_file")
    echo "⚙️  Loading: $filename"
    
    if psql "$DB_URL" -f "$seed_file" -v ON_ERROR_STOP=1 > /dev/null; then
      echo "✅ Seed data loaded: $filename"
    else
      echo "❌ Seed loading failed: $filename"
      exit 1
    fi
  fi
done

# Verify seed data
echo "🔍 Verifying seed data..."
psql "$DB_URL" -c "
SELECT 'Factories' as entity, count(*) as count FROM factories
UNION ALL
SELECT 'Users', count(*) FROM users  
UNION ALL
SELECT 'Work Orders', count(*) FROM work_orders
UNION ALL
SELECT 'Packing Units', count(*) FROM packing_units;
" -t

echo "🎉 Seed data loading complete!"