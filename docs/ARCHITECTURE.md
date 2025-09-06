# CopperCore ERP Architecture

## Overview

CopperCore is a factory-scoped ERP system for wire/cable manufacturing with strict RLS security, PU-level traceability, and Pakistan fiscal compliance.

## Architecture Principles

### 1. Factory Scoping (RLS-First)
- Every data table includes `factory_id` column
- Row Level Security (RLS) enforces factory boundaries
- CEO/Director roles have global access bypass
- Factory workers see only their factory data

### 2. Optimistic Concurrency
- All entities include `version` and `updated_at` columns
- API returns HTTP 409 on version conflicts
- Client retry pattern with fresh data fetch

### 3. Realtime Updates
- Supabase Realtime broadcasts changes by factory
- TanStack Query cache invalidation on updates
- Fine-grained cache keys for minimal refetch

### 4. Audit Trail
- Tamper-evident audit log with hash chaining
- All mutations trigger audit events
- Who/What/When/Why tracking

## System Components

### Frontend (apps/web)
- **Framework:** React + TypeScript + Vite
- **State Management:** TanStack Query for server state
- **UI:** Tailwind CSS + Headless UI components
- **Scanner-First:** QR/barcode scanner integration
- **Realtime:** Supabase Realtime subscriptions

### Backend (apps/api) 
- **Framework:** Fastify + TypeScript
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth with RLS
- **Business Logic:** Domain services with strict boundaries

### Shared Packages (packages/shared)
- **Types:** Zod schemas for runtime validation
- **Cache Keys:** TanStack Query key factories
- **Utilities:** Cross-platform helpers

### Infrastructure (infra/)
- **Migrations:** SQL schema evolution
- **Policies:** RLS security rules  
- **Seeds:** Development test data
- **Scripts:** Deployment automation

## Data Flow

### 1. Factory Worker Scans PU Code
```
Scanner → API validation → RLS check → Realtime broadcast → Cache invalidation
```

### 2. Inter-Factory Transfer (DN → GRN)
```
Factory A: Create DN → Dispatch PUs → Status: IN_TRANSIT
Factory B: Receive DN → Create GRN → Verify PUs → Status: DELIVERED
```

### 3. QC Testing Flow
```
PU created → QC test → Pass/Hold/Fail → Audit event → Certificate PDF
```

## Security Model

### Authentication
- Supabase Auth with email/password
- JWT tokens with factory_id claim
- Role-based permissions (CEO/Director/Manager/Worker)

### Authorization (RLS)
- Table-level policies enforce factory scoping
- CEO/Director bypass for global operations
- Special cases for inter-factory transfers

### Audit
- All data changes logged with user context
- Hash-linked chain prevents tampering
- Immutable event store design

## Performance Considerations

### Database
- Factory-partitioned indexes on high-volume tables
- Connection pooling via Supabase
- Read replicas for reporting queries

### Caching
- TanStack Query for client-side caching
- Factory-scoped cache invalidation
- Optimistic updates with rollback

### Realtime
- Factory-specific channels to reduce noise
- Selective table subscriptions
- Batch updates to prevent flooding

## Deployment Architecture

### Environments
- **Development:** Local DB + hot reload
- **Staging:** Supabase staging project
- **Production:** Supabase production with backups

### CI/CD Pipeline
1. Lint + TypeScript validation
2. Unit tests
3. Integration tests with ephemeral DB
4. E2E tests with Playwright
5. Build + deploy

### Monitoring
- Supabase Dashboard for DB metrics
- Application logs via structured JSON
- Alert on RLS policy violations

## Technology Decisions

See ADR documents for detailed rationale:
- [ADR-0001: Monorepo Structure](./adr/0001-monorepo-structure.md)  
- [ADR-0002: Supabase Platform](./adr/0002-supabase-platform.md)