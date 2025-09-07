# CopperCore Infrastructure

This directory contains database migrations, policies, templates, and configuration for the CopperCore ERP system.

## Structure

```
infra/
├── migrations/          # Database schema evolution
│   ├── 000_base.sql     # Initial setup with RLS
│   └── 010_tables_min.sql # Core business tables
├── policies/           # RLS security policies
│   ├── rls_factory.sql  # Basic factory-scoped policies
│   └── rls_templates.sql # Enhanced policy templates
├── templates/          # Reusable SQL templates
│   ├── optimistic_locking.sql # Version-based concurrency
│   ├── audit_chain.sql  # Tamper-evident audit trail
│   ├── realtime_setup.sql # Supabase Realtime config
│   └── storage_policies.sql # File storage security
├── scripts/           # Utility scripts
│   ├── migrate.sh     # Migration runner
│   └── seed.sh        # Seed data loader
└── seed/              # Development seed data
    └── seed.sql       # Sample data for testing
```

## Usage

### 1. Run Migrations
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/coppercore_dev"
./infra/scripts/migrate.sh
```

### 2. Load Seed Data  
```bash
./infra/scripts/seed.sh
```

### 3. Apply Templates (as needed)
```sql
-- Apply optimistic locking to tables
\i infra/templates/optimistic_locking.sql

-- Set up audit chain
\i infra/templates/audit_chain.sql

-- Configure realtime
\i infra/templates/realtime_setup.sql

-- Set up storage policies
\i infra/templates/storage_policies.sql
```

## Key Features

### Factory-Scoped Security (RLS)
- All tables have `factory_id` column
- CEO/Director bypass for global access
- Factory workers see only their factory data
- Special cases for inter-factory transfers

### Optimistic Locking
- Version-based concurrency control
- HTTP 409 on conflicts with retry guidance
- Automatic version increment on updates

### Tamper-Evident Audit Chain
- SHA-256 hash-linked audit events
- Immutable event store design
- Factory-scoped with integrity verification

### Realtime Updates
- Factory-scoped channels (`factory_{uuid}`)
- Global channel for CEO/Director
- Cache invalidation patterns integrated

### Secure File Storage
- Factory-scoped bucket policies
- Signed URLs with expiration
- QC certificates, packing labels, dispatch docs
- Comprehensive audit trail

## Security Principles

1. **Least Privilege**: Users see only what they need
2. **Factory Isolation**: Complete data separation between factories  
3. **Audit Everything**: All changes tracked with hash chain
4. **Global Override**: CEO/Director can access all factories
5. **Tamper Evidence**: Hash chain prevents data manipulation

## Template Usage

The templates are designed to be:
- **Reusable**: Apply to any table needing the pattern
- **Secure by Default**: Factory scoping built-in
- **Performance Optimized**: Proper indexing included
- **Audit Ready**: Automatic audit trail creation

Uncomment and customize the template examples for your specific tables and requirements.