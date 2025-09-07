# ADR-0001: Opening Stock Migration Design

**Status**: Proposed  
**Date**: 2025-09-07  
**Architect**: Claude Code (architect-erp agent)

## Context

The CopperCore ERP system needs to support Opening Stock functionality per PRD §5.12 "Manage Company (Factories, Users, Opening Stock)". The frontend UI exists with mock data, but the backend database schema needs to be implemented.

**Current State:**
- Frontend has opening stock UI with mock data at `apps/web/src/features/manage-company/hooks/useOpeningStock.ts`
- Base schema exists with `inventory_lots` table from migration `010_tables_min.sql`
- No audit trail mechanism for inventory movements
- No factory-scoped RLS policies for opening stock

**Requirements from PRD:**
- CEO/Directors can add opening stock by lot with audit
- Factory scoping enforced via RLS
- Audit trail for all inventory changes
- Support lot tracking with expiry dates and notes

## Decision

**Enhance existing `inventory_lots` table** rather than creating a separate opening_stock table:
1. Add new columns: `expiry_date`, `notes`, `created_by`, `updated_by`, `movement_type`
2. Create `inventory_movements` table for complete audit trail
3. Implement factory-scoped RLS policies using enhanced helper functions
4. Add specialized functions for opening stock operations

**Architecture Decisions:**

### 1. Single Table Design
- **Decision**: Enhance `inventory_lots` instead of separate table
- **Rationale**: Opening stock lots ARE inventory lots, just with different source
- **Benefits**: Unified inventory visibility, simpler queries, consistent schema

### 2. Audit Trail via Movement Records
- **Decision**: Create `inventory_movements` table with immutable records
- **Rationale**: Complete traceability required per PRD audit requirements
- **Pattern**: quantity_before + quantity_change = quantity_after (enforced by constraint)

### 3. Factory Scoping via Enhanced RLS
- **Decision**: Use `cc_is_global()` and `cc_assigned_factories()` helper functions
- **Rationale**: Consistent with existing schema patterns from migration 020
- **Enforcement**: CEO/Director global access, others factory-scoped

### 4. Optimistic Locking Strategy
- **Decision**: Use version field + updated_at with 409 conflict handling
- **Rationale**: Prevent concurrent modifications, required per PRD
- **Implementation**: Triggers automatically increment version on updates

## Implementation Details

**Migration File**: `infra/migrations/024_opening_stock_enhanced.sql`

**New Tables:**
```sql
inventory_movements:
- Immutable audit trail (no UPDATE/DELETE policies)
- Links to inventory_lots via foreign key
- Tracks quantity changes with before/after/delta
- References external entities (WO, DN, GRN) via reference_type/reference_id
```

**Enhanced Tables:**
```sql
inventory_lots:
+ expiry_date DATE
+ notes TEXT  
+ created_by UUID REFERENCES users(id)
+ updated_by UUID REFERENCES users(id)
+ movement_type VARCHAR(50) -- 'OPENING_STOCK', 'PRODUCTION', etc.
```

**Key Functions:**
- `cc_create_opening_stock()` - Safe opening stock creation with movement logging
- `cc_create_inventory_movement()` - Centralized movement record creation
- `inventory_lots_movement_trigger()` - Auto-create movements on quantity changes

**Views:**
- `opening_stock_view` - Factory-scoped view joining lots with factory/SKU details

**TypeScript Types:**
- Updated `Database` interface in `apps/api/src/types/database.ts`
- Added inventory_lots, inventory_movements table definitions
- Added opening_stock_view and function signatures
- Added movement_type enum

## Consequences

**Positive:**
- ✅ Unified inventory management (opening stock + production stock)
- ✅ Complete audit trail for all inventory movements
- ✅ Factory scoping enforced consistently with existing patterns
- ✅ TypeScript integration for type-safe API development
- ✅ Optimistic locking prevents data conflicts

**Negative:**
- ⚠️  More complex queries needed to filter by movement_type
- ⚠️  Additional storage overhead for movement records
- ⚠️  Existing TypeScript compilation errors need resolution

**Risks & Mitigations:**
- **Risk**: Movement records could grow large over time
  - **Mitigation**: Partition by factory_id and movement_date, archive old records
- **Risk**: Trigger-based movement creation could fail silently
  - **Mitigation**: Add monitoring for movement record creation gaps
- **Risk**: RLS policies might not enforce factory scoping correctly
  - **Mitigation**: Comprehensive test suite for different user roles

## Alternatives Considered

### Alternative 1: Separate opening_stock table
- **Rejected**: Would duplicate lot management logic and create sync issues
- **Analysis**: More tables, complex joins, inconsistent inventory visibility

### Alternative 2: JSON movement log in inventory_lots
- **Rejected**: Poor queryability, no referential integrity
- **Analysis**: Would make audit reporting difficult, violates normalization

### Alternative 3: Event sourcing pattern
- **Rejected**: Over-engineering for current requirements
- **Analysis**: Complex implementation, immediate consistency issues

## PRD Compliance

**§5.12 Manage Company**: ✅ CEO/Director can add opening stock by lot with audit  
**§3.7 Realtime**: ✅ inventory_lots and movements tables support realtime subscriptions  
**§8 Audit**: ✅ Immutable movement records provide complete audit trail  
**Factory Scoping**: ✅ RLS policies enforce factory boundaries per user assignments

## Next Steps

1. **Requires Approval**: Schema migration and RLS changes per CLAUDE.md §2.2
2. **Test Migration**: Run on staging with sample data
3. **Backend API**: Implement opening stock CRUD operations (Task API-3)
4. **RLS Testing**: Comprehensive test suite for factory scoping
5. **Frontend Integration**: Replace mock data with real API calls (Task FE-2)

## Acceptance Criteria

- [ ] Migration runs successfully on development database
- [ ] RLS policies prevent cross-factory data access  
- [ ] Opening stock creation generates movement records automatically
- [ ] TypeScript types enable type-safe API development
- [ ] All existing inventory functionality continues to work
- [ ] Performance testing shows acceptable query response times

## References

- **PRD**: `docs/PRD/PRD_v1.5.md` §5.12, §3.7, §8
- **Migration**: `infra/migrations/024_opening_stock_enhanced.sql`
- **Types**: `apps/api/src/types/database.ts`
- **Frontend**: `apps/web/src/features/manage-company/hooks/useOpeningStock.ts`
- **Existing Patterns**: `infra/migrations/020_factories_users_enhanced.sql`