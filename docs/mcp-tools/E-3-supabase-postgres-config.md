# E-3: Supabase/Postgres MCP Config (Dev RW, Prod RO)

## Purpose
Environment-aware Postgres access for Claude agents with read-write on development/staging and read-only on production, enforcing the "prod DB is read-only" rule from CLAUDE.md.

## Environment-Based Access Control

### Development Environment
- ✅ **Allowed**: Full read-write access for testing, migrations, seed data
- ✅ **Allowed**: CREATE, ALTER, INSERT, UPDATE, DELETE operations
- ✅ **Allowed**: Schema changes and RLS policy testing

### Staging Environment  
- ✅ **Allowed**: Read-write for integration testing
- ✅ **Allowed**: Migration dry-runs and validation
- ⚠️ **Restricted**: Schema changes require approval (per CLAUDE.md §2.2)

### Production Environment
- ✅ **Allowed**: SELECT queries for debugging and analysis
- ✅ **Allowed**: Read-only performance monitoring
- ❌ **Prohibited**: Any write operations (INSERT, UPDATE, DELETE)
- ❌ **Prohibited**: Schema changes (CREATE, ALTER, DROP)

## Connection Configuration

### Claude Desktop Setup
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DATABASE_URL}"
      }
    }
  }
}
```

### Environment Variables
```bash
# Development (full access)
export SUPABASE_DATABASE_URL="postgresql://postgres:password@localhost:54322/postgres"

# Staging (read-write with approval gates)
export SUPABASE_DATABASE_URL="postgresql://postgres:password@staging-db.supabase.co:5432/postgres"

# Production (read-only enforced)
export SUPABASE_DATABASE_URL="postgresql://readonly_user:password@prod-db.supabase.co:5432/postgres"
```

## Database User Roles

### Development User
```sql
-- Full privileges for local development
CREATE USER dev_claude WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE postgres TO dev_claude;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev_claude;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dev_claude;
```

### Staging User
```sql
-- Read-write with schema change restrictions
CREATE USER staging_claude WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE postgres TO staging_claude;
GRANT USAGE ON SCHEMA public TO staging_claude;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO staging_claude;
-- Schema changes require manual approval
```

### Production User (Read-Only)
```sql
-- Strictly read-only access
CREATE USER readonly_claude WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE postgres TO readonly_claude;
GRANT USAGE ON SCHEMA public TO readonly_claude;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_claude;
-- No write permissions whatsoever
```

## RLS and Factory Scoping
All environments enforce Row Level Security:
```sql
-- Ensure factory scoping is respected
SELECT current_setting('app.current_factory_id');

-- Verify RLS policies are active
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## Agent Usage Guidelines

### All Agents
- Must respect factory scoping via RLS
- Cannot access data outside assigned factory_id
- CEO/Director roles bypass factory scoping (as per PRD)

### Backend/Architect Agents
- Dev: Full schema and data access
- Staging: Migration testing with approval
- Prod: Read-only analysis and debugging

### QA Agent
- Dev: Full access for test data setup
- Staging: Read-write for integration tests  
- Prod: Read-only for bug investigation

### Other Agents
- Limited to read-only queries in all environments
- Must use application APIs for data modifications

## Security Safeguards

### Connection Validation
```sql
-- Verify current user permissions
SELECT current_user, current_database();

-- Check if in read-only mode
SELECT pg_is_in_recovery();

-- Validate factory RLS is active
SHOW row_security;
```

### Query Restrictions
Production environment blocks:
- `INSERT`, `UPDATE`, `DELETE` statements
- `CREATE`, `ALTER`, `DROP` schema commands
- `GRANT`, `REVOKE` permission changes
- Functions that modify data

## Migration Workflow
Per CLAUDE.md §2.2 approval requirements:
1. **Dev**: Test migrations locally
2. **Staging**: Dry-run with approval + PITR checkpoint
3. **Prod**: Manual migration with CEO/Director approval

## Testing
```bash
# Test connection
npx @modelcontextprotocol/server-postgres --help

# Verify environment-appropriate access
psql $SUPABASE_DATABASE_URL -c "SELECT current_user, current_database();"

# Test RLS enforcement
psql $SUPABASE_DATABASE_URL -c "SELECT COUNT(*) FROM work_orders;"
```

## Rollback Plan
If database access causes issues:
1. Revoke database user permissions immediately
2. Update connection string to read-only user
3. Audit recent database queries for unauthorized changes
4. Restore from PITR if data corruption detected

## Environment Detection
```sql
-- Helper function to detect environment
CREATE OR REPLACE FUNCTION get_environment()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.environment', true),
    CASE 
      WHEN current_database() LIKE '%local%' THEN 'development'
      WHEN current_database() LIKE '%staging%' THEN 'staging'
      ELSE 'production'
    END
  );
END;
$$ LANGUAGE plpgsql;
```

## PRD References
- PRD-v1.5.md §3.2: "Factory-scoped RLS enforced across all environments"
- CLAUDE.md §1: "Prod DB is read-only for all agents"
- CLAUDE.md §2.2: "Schema & migrations require human approval"
- CLAUDE.md §5: "RLS/Policies: Do not weaken/enlarge access without Architect + CEO approval"