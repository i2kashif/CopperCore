# Session Checklist / Task Board

> **Purpose**: Single source of progress truth for CopperCore  
> **Auto-archive**: When >200 lines, move completed items to archive

## Legend
🟦 Todo • 🟨 In Progress • 🟩 Done • 🟥 Blocked

---

## 🔥 Priority Queue (Next 5 Tasks)

### Phase 1: Database Foundation (Immediate)
1. 🟩 **DB-1**: Create opening_stock migration & generate types ✅ COMPLETED
   - ✅ Enhanced inventory_lots table with opening stock fields
   - ✅ Created inventory_movements table for audit trail
   - ✅ Updated database types with new schemas
   - ✅ Created ADR-0001 for architectural decisions
   - **Owner**: Architect • **Agent**: architect-erp • **Complexity**: M
   - **Dependencies**: None
   - **Deliverables**: Migration file (024_opening_stock_enhanced.sql), updated types, ADR
   - **Files**: /infra/migrations/024_opening_stock_enhanced.sql, /apps/api/src/types/database.ts, /docs/adr/0001-opening-stock-migration-design.md

### Phase 2: Backend APIs (Blocking Frontend)
2. 🟦 **API-1**: Product Families Backend Module
   - Routes, service, validation, repository
   - Factory scoping, audit logging
   - Optimistic locking (version field)
   - **Owner**: Backend • **Agent**: backend-developer • **Complexity**: L
   - **Dependencies**: DB-1
   - **Deliverables**: Complete CRUD API at /api/product-families

3. 🟩 **API-2**: SKUs/Catalog Backend Module ✅ COMPLETED
   - ✅ Routes, service, validation, repository
   - ✅ Product family relationship and attribute inheritance
   - ✅ Factory scoping, audit logging, optimistic locking
   - ✅ Approval workflow for pending SKUs
   - ✅ Bulk SKU generation from attribute combinations
   - **Owner**: Backend • **Agent**: backend-developer • **Complexity**: L
   - **Dependencies**: DB-1, API-1
   - **Deliverables**: Complete CRUD API at /api/skus ✅
   - **Files**: /apps/api/src/modules/skus/{repository,service,schema,types,routes}.ts, /infra/migrations/027_skus_enhanced.sql

4. 🟦 **API-3**: Opening Stock Backend Module
   - Routes, service, validation, repository
   - SKU relationship, lot tracking
   - Factory scoping, audit logging
   - **Owner**: Backend • **Agent**: backend-developer • **Complexity**: M
   - **Dependencies**: DB-1, API-2
   - **Deliverables**: Complete CRUD API at /api/opening-stock

5. 🟦 **RLS-1**: Create RLS Policies for All Tables
   - Product families, SKUs, opening stock
   - Factory scoping with CEO/Director bypass
   - Test policy effectiveness
   - **Owner**: Architect • **Agent**: architect-erp • **Complexity**: M
   - **Dependencies**: DB-1
   - **Deliverables**: RLS policy migration file

---

## 🚧 In Progress

None currently - waiting to start Phase 1

---

## 📋 Next Phases (After Priority Queue)

### Phase 3: Frontend Integration (After Backend)
- 🟦 **FE-1**: API Client Services
  - Product Families client service
  - SKUs client service  
  - Opening Stock client service
  - **Owner**: Frontend • **Agent**: frontend-developer • **Complexity**: M
  - **Dependencies**: API-1, API-2, API-3

- 🟦 **FE-2**: Wire Hooks to Real APIs
  - Replace mock data in useProductFamilies
  - Replace mock data in useSKUs
  - Replace mock data in useOpeningStock
  - **Owner**: Frontend • **Agent**: frontend-developer • **Complexity**: S
  - **Dependencies**: FE-1

### Phase 4: Realtime & Polish
- 🟦 **RT-1**: Realtime Subscriptions
  - Product families realtime updates
  - SKUs realtime updates
  - Opening stock realtime updates
  - **Owner**: Frontend • **Agent**: frontend-developer • **Complexity**: M
  - **Dependencies**: FE-2 • **PRD**: §3.7

### Phase 5: Testing & Validation
- 🟦 **TEST-1**: Integration Tests
  - Product Families API tests
  - SKUs API tests
  - Opening Stock API tests
  - **Owner**: QA • **Agent**: qa-test-engineer • **Complexity**: M
  - **Dependencies**: API-1, API-2, API-3

- 🟦 **TEST-2**: E2E Tests & RLS Validation
  - Manage Company module E2E
  - Factory scoping validation
  - Audit trail verification
  - **Owner**: QA • **Agent**: qa-test-engineer • **Complexity**: L
  - **Dependencies**: FE-2

## 📋 Backlog (By Module)

### Work Orders (PRD §5.3)
- 🟦 WO Creation UI with SKU selection
- 🟦 WO Acceptance workflow
- 🟦 Material issue/return tracking
- 🟦 Production log with machine requirements

### Packing & Dispatch (PRD §5.5-5.6)
- 🟦 Scanner-first packing list
- 🟦 PU label generation/reprint
- 🟦 Delivery Note creation
- 🟦 DN rejection handling

### GRN & Inventory (PRD §5.7-5.8)
- 🟦 GRN creation from DN
- 🟦 Discrepancy management
- 🟦 Inventory visibility by factory
- 🟦 Stock movement tracking

### QC & Testing (PRD §5.10)
- 🟦 QC Plan (QCP) builder
- 🟦 Test result entry
- 🟦 HOLD/FAIL blocking matrix
- 🟦 CEO/Director override with audit

### Pakistan Compliance (PRD §8)
- 🟦 Sales Tax Invoice generation
- 🟦 E-Invoice integration
- 🟦 Withholding tax calculations
- 🟦 FBR reporting

---

## ✅ Recently Completed (Last 7 Days)

### 2025-09-07
- 🟩 **Agent System Setup**: Created 8 specialized agents
- 🟩 **Documentation Update**: Refined CLAUDE.md and AGENT.md
- 🟩 **Session Cleanup**: Organized memory and checklist files
- 🟩 **Backend API**: Complete CRUD for factories/users
- 🟩 **Mock Database**: Development environment without Supabase
- 🟩 **UI Foundation**: Auth, Manage Company, Product Families, Catalog
- 🟩 **Code Quality**: Fixed ESLint configuration
- 🟩 **SKUs Backend Module**: Complete CRUD API with attribute validation, approval workflow, bulk generation

### 2025-09-06
- 🟩 **Foundation**: Complete monorepo setup with CI/CD
- 🟩 **Documentation**: PRD-v1.5.md and operating guides
- 🟩 **Database Schema**: Initial Supabase tables

---

## 📊 Progress Summary

- **Foundation**: 100% Complete ✅
- **Auth & Admin UI**: 90% Complete (missing profile/context)
- **Backend API**: 85% Complete (SKUs module completed, Opening Stock pending)
- **Core Workflows**: 10% Complete (Product Families and SKUs backend done)
- **Testing**: 20% Complete (basic structure)
- **Documentation**: 85% Complete (session logs updated)

---

## Notes for Agents

1. **Always update status** when starting/completing tasks
2. **Use appropriate agent** via Task tool
3. **Reference PRD sections** in all work
4. **Create tests** alongside implementation
5. **Request approval** for schema/RLS/pricing changes