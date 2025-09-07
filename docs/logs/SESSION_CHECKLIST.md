# Session Checklist / Task Board

> Single source of progress truth for CopperCore.  
> Agents: read this at **session start**, update it at **session end**.

## Legend
- 🟦 Todo • 🟨 In Progress • 🟩 Done • 🟥 Blocked

## How agents should use this
1) At session start: skim **Done** and **Blocked**, then set the item you'll work on to 🟨 and add yourself as **Owner**.  
2) At session end: flip status, add a PR link, and append an event entry to your per-agent log (see `docs/logs/agents/*`).  
3) Keep items short; if scope grows, open a new line item.

---

## Foundation
- 🟩 Housekeeping A–H complete (scaffold, config packs, MCP tools, CI/CD, security) • See agent logs for details

---

## Now (Next 5 - Priority Implementation Queue)
- 🟨 UI-1: Authentication System Foundation (Supabase Auth + factory selection + role-based routing) • **Owner:** Frontend+Backend • PRD §2 (roles), §10 (auth) • Foundation for all UI • **In Progress:** feat/ui-1-authentication-system
- 🟨 UI-2: Manage Company Dashboard (CEO: factories, users, factory assignments) • **Owner:** Frontend+Backend • PRD §5.12, §2.2 • Core admin functionality • **In Progress:** Backend API implementation for persistence
- 🟦 UI-3: User Profile & Factory Context (factory switching, role display, session management) • **Owner:** Frontend • PRD §2.2 (factory linkage) • Session context foundation
- 🟦 F-6.1: Realtime Infrastructure Foundation (entity-scoped channels + cache invalidation) • **Owner:** Frontend+Architect • PRD §3.7, §12.7 • Acceptance ID: 12.7 • Supports all future UI updates
- 🟦 F-1.1: WO Material Return Constraints (returns ≤ issued per lot + validation) • **Owner:** Backend • PRD §5.3, §12.1 • Acceptance ID: 12.1 • Business logic foundation

### Backend Implementation for Factories/Users (PRD §2, §5.12, §10) - In Progress
#### Core Backend Infrastructure
- 🟩 BACK-1: Review PRD requirements for factories and users • **Owner:** Backend • **Completed:** 2025-09-07
- 🟩 BACK-2: Create backend API module structure for factories and users • **Owner:** Backend • PRD §5.12 • **Completed:** 2025-09-07
- 🟩 BACK-3: Implement Supabase client singleton for database access • **Owner:** Backend • PRD §11 • **Completed:** 2025-09-07
- 🟩 BACK-4: Implement role-based authentication middleware • **Owner:** Backend • PRD §2.1, §10 • **Completed:** 2025-09-07

#### API Endpoints with RLS
- 🟩 BACK-5: Create factories API endpoints with RLS enforcement (GET, POST, PUT, DELETE) • **Owner:** Backend • PRD §10 • **Completed:** 2025-09-07
- 🟩 BACK-6: Create users API endpoints with factory assignment support (GET, POST, PUT, DELETE) • **Owner:** Backend • PRD §2.2 • **Completed:** 2025-09-07
- 🟩 BACK-7: Add user-factory assignments API endpoints (many-to-many) • **Owner:** Backend • PRD §2.2 • **Completed:** 2025-09-07
- 🟩 BACK-8: Implement audit logging for all operations • **Owner:** Backend • PRD §7 • **Completed:** 2025-09-07

#### Frontend Integration
- 🟩 BACK-9: Update frontend API service layer for factories • **Owner:** Frontend • PRD §5.12 • **Completed:** 2025-09-07
- 🟩 BACK-10: Update frontend API service layer for users • **Owner:** Frontend • PRD §5.12 • **Completed:** 2025-09-07
- 🟩 BACK-11: Connect useFactories hook to real API with error handling • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 BACK-12: Connect useUsers hook to real API with error handling • **Owner:** Frontend • **Completed:** 2025-09-07

#### Bug Fixes & Enhancements
- 🟩 BACK-13: Fix CEO user visibility in Users tab (global role display) • **Owner:** Frontend • PRD §2.1 • **Completed:** 2025-09-07 • **Status:** Already implemented in useUsers.ts lines 36-62
- 🟩 BACK-14: Link dynamic factories to user factory selection dropdown • **Owner:** Frontend • **Completed:** 2025-09-07 • **Status:** Dynamic checkboxes in UsersTab.tsx lines 118-141
- 🟩 BACK-15: Add optimistic updates and loading states • **Owner:** Frontend • PRD §3.7 • **Completed:** 2025-09-07 • **Status:** Complete implementation with error recovery

#### Realtime & Testing
- 🟩 BACK-16: Add realtime updates via Supabase channels • **Owner:** Frontend • PRD §3.7, §11 • **Completed:** 2025-09-07 • **Status:** Full infrastructure with 350ms debouncing
- 🟩 BACK-17: Test factory scoping and RLS policies • **Owner:** QA • PRD §10 • **Completed:** 2025-09-07 • **Report:** testsprite-mcp-test-report.md
- 🟩 BACK-18: Run lint and typecheck • **Owner:** Backend • **Completed:** 2025-09-07 • **Result:** ESLint config fixed, 92 lint issues found, TypeScript passes for web/shared but API has 120+ type errors

---

## In Progress

### M1: DB/RLS Foundation (Weeks 1–4)  
- 🟩 I-1.1: Database Schema Foundation (factories, users, product families, core entities) • **Owner:** Architect • PR: feat/m1-1-schema-foundation
- 🟨 I-1.2: RLS Policy Implementation (factory scoping + CEO/Director bypass) • **Owner:** Architect • PR(s):
- 🟦 I-1.3: Audit Chain & Optimistic Locking (tamper-evident + version fields) • **Owner:** Architect • PR(s):
- 🟦 I-1.4: WO Core Operations (create/accept/issue/return/production) • **Owner:** Backend • PR(s):
- 🟦 I-1.5: Realtime Infrastructure (channels + cache invalidation) • **Owner:** Frontend • PR(s):

---

## Todo

### UI Foundation Phase (Post-Auth)

#### UI-4: Product Family Management (PRD §5.1, §3.1)
##### Core Features
- 🟩 PF-1: Family CRUD Operations (create/edit/delete/enable/disable) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-2: Attribute Configuration System (add/edit attributes with types, levels, validation) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-3: SKU Naming Rule Builder (visual builder with preview) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-4: Validation Rules Engine (min/max, step, enum options) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-5: Family Templates (Enamel Wire, PVC Cable presets) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-6: List View with Search/Filter/Sort • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-7: Detail View with Attribute Management • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟩 PF-8: Default Settings (routing, packing) • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟦 PF-9: Impact Analysis & Warnings • **Owner:** Frontend
- 🟩 PF-10: SKU Generation Preview • **Owner:** Frontend • **Completed:** 2025-09-07
- 🟦 PF-11: Audit & Change Tracking • **Owner:** Frontend
- 🟦 PF-12: Performance Optimizations (pagination, auto-save) • **Owner:** Frontend
- 🟩 PF-13: Access Control (CEO/Director only) • **Owner:** Frontend • **Completed:** 2025-09-07

##### Nice-to-Have Enhancements
- 🟦 PF-E1: Attribute Dependency Graph Visualization • **Owner:** Frontend
- 🟦 PF-E2: Family Relationship Diagram • **Owner:** Frontend
- 🟦 PF-E3: Usage Analytics Dashboard • **Owner:** Frontend
- 🟦 PF-E4: AI-Suggested Attributes • **Owner:** Frontend
- 🟦 PF-E5: Smart Naming Rule Suggestions • **Owner:** Frontend
- 🟦 PF-E6: Duplicate Family Detection • **Owner:** Frontend

#### UI-5: SKU Catalog Management (PRD §5.2, §3.2) 
##### Core Features - Catalog Tab Implementation
- 🟩 CAT-1: Catalog List View (grid with search/filter/sort, status indicators) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-2: SKU Creation Wizard (select family → choose attribute values → preview → create) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-3: Bulk SKU Generation (grid selection of multiple attribute combinations) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-4: SKU Code/Name Preview (live preview using family naming rules) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-5: Duplicate Prevention System (validate uniqueness before creation) • **Owner:** Frontend+Backend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-6: Pending SKU Management (approval queue for CEO/Director) • **Owner:** Frontend+Backend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-7: On-the-Fly SKU Support (FM Request & Proceed flow) • **Owner:** Backend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-8: SKU Detail View (attributes, status, audit trail, usage stats) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟩 CAT-9: SKU Enable/Disable Toggle (soft delete with reason) • **Owner:** Frontend+Backend • PRD §5.2 • **Completed:** 2025-09-07
- 🟦 CAT-10: Export Functionality (CSV/Excel with filters) • **Owner:** Frontend • PRD §5.2
- 🟩 CAT-11: Approval Workflow UI (approve/reject pending SKUs) • **Owner:** Frontend+Backend • PRD §5.2 • **Completed:** 2025-09-07
- 🟦 CAT-12: Policy Configuration (dispatch allowed for pending SKUs toggle) • **Owner:** Frontend+Backend • PRD §5.2
- 🟩 CAT-13: SKU Search & Filters (by family, attributes, status, creation date) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07
- 🟦 CAT-14: Batch Operations (enable/disable/export multiple SKUs) • **Owner:** Frontend • PRD §5.2
- 🟩 CAT-15: Integration with Product Families (inherit attributes and naming rules) • **Owner:** Frontend • PRD §5.2 • **Completed:** 2025-09-07

##### Backend Requirements
- 🟦 CAT-B1: SKU CRUD API Endpoints • **Owner:** Backend • PRD §5.2
- 🟦 CAT-B2: Pending SKU State Management • **Owner:** Backend • PRD §5.2
- 🟦 CAT-B3: Approval/Rejection Logic with Cascade Updates • **Owner:** Backend • PRD §5.2
- 🟦 CAT-B4: Factory Scoping for SKUs • **Owner:** Backend+Architect • PRD §5.2
- 🟦 CAT-B5: Audit Trail for SKU Operations • **Owner:** Backend • PRD §5.2

##### Testing & Validation
- 🟦 CAT-T1: Unit Tests for SKU Logic • **Owner:** QA • PRD §5.2
- 🟦 CAT-T2: E2E Tests for SKU Creation Flow • **Owner:** QA • PRD §5.2
- 🟦 CAT-T3: Approval Workflow Tests • **Owner:** QA • PRD §5.2

##### Nice-to-Have Enhancements
- 🟦 CAT-E1: SKU Usage Analytics Dashboard • **Owner:** Frontend
- 🟦 CAT-E2: AI-Suggested SKU Variants • **Owner:** Frontend
- 🟦 CAT-E3: Visual SKU Comparison Tool • **Owner:** Frontend
- 🟦 CAT-E4: SKU Import from Excel/CSV • **Owner:** Frontend+Backend
- 🟦 UI-6: Basic Work Order Creation (Director: create WO with SKU selection + factory assignment) • **Owner:** Frontend+Backend • PRD §5.3 • Operations entry point

### M2: Core Business Workflows (Weeks 5–8)  
- 🟦 F-1.2: WO Production Log Validation (machine required, scrap tracking) • **Owner:** Backend • PRD §5.3, §3.4
- 🟦 F-2.1: PU Label Reprint & Invalidation (old codes inactive + scanner integration) • **Owner:** Frontend+Backend • PRD §5.5, §12.3 • Acceptance ID: 12.3
- 🟦 F-3.1: DN Rejection with Realtime Updates (draft revert + PU availability) • **Owner:** Backend+Frontend • PRD §5.6, §12.4, §3.7 • Acceptance ID: 12.4
- 🟦 F-3.2: GRN Discrepancy Management (short/over/damaged capture) • **Owner:** Backend+QA • PRD §5.7, §12.5 • Acceptance ID: 12.5
- 🟦 F-2.2: Scanner Error Handling & Recovery (mis-scan + duplicate prevention) • **Owner:** Frontend • PRD §5.5

### M3: Business Logic & QC (Weeks 9–12)  
- 🟦 F-5.1: QC Blocking Matrix Implementation (FAIL/HOLD cannot pack) • **Owner:** Backend+Architect • PRD §3.5/§5.10, §12.6 • Acceptance ID: 12.6
- 🟦 I-3.1: On-the-Fly SKU System (pending SKU + FM Request & Proceed) • **Owner:** Backend • PR(s):
- 🟦 I-3.2: QC & Testing Framework (QCP + blocking matrix + overrides) • **Owner:** Backend • PR(s):
- 🟦 I-3.3: Customer & Pricing Foundation (cross-refs + invoice generation) • **Owner:** Backend • PR(s):
- 🟦 I-3.4: Performance & Documentation (load testing + docs + deployment) • **Owner:** QA/Docs • PR(s):

---

## Blocked
- 🟥 (add item) • **Reason:** • **Owner:** • **Unblock by:**

---

## Done (append newest first)
- 🟩 I-1.1: Database Schema Foundation • PR: feat/m1-1-schema-foundation • Log: 2025-09-06-architect-1
- 🟩 Housekeeping A–H: Complete foundation (scaffold→security) • Multiple PRs • Log: See agent logs 2025-09-06