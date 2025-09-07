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
- 🟦 UI-1: Authentication System Foundation (Supabase Auth + factory selection + role-based routing) • **Owner:** Frontend+Backend • PRD §2 (roles), §10 (auth) • Foundation for all UI
- 🟦 UI-2: Manage Company Dashboard (CEO: factories, users, factory assignments) • **Owner:** Frontend+Backend • PRD §5.12, §2.2 • Core admin functionality  
- 🟦 UI-3: User Profile & Factory Context (factory switching, role display, session management) • **Owner:** Frontend • PRD §2.2 (factory linkage) • Session context foundation
- 🟦 F-6.1: Realtime Infrastructure Foundation (entity-scoped channels + cache invalidation) • **Owner:** Frontend+Architect • PRD §3.7, §12.7 • Acceptance ID: 12.7 • Supports all future UI updates
- 🟦 F-1.1: WO Material Return Constraints (returns ≤ issued per lot + validation) • **Owner:** Backend • PRD §5.3, §12.1 • Acceptance ID: 12.1 • Business logic foundation

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
- 🟦 UI-4: Product Family Management UI (CEO: create/edit families + attributes configuration) • **Owner:** Frontend+Backend • PRD §5.1, §3.1 • Product setup foundation
- 🟦 UI-5: SKU Catalog Management (CEO/Director: bulk generation, family-based SKU creation) • **Owner:** Frontend+Backend • PRD §5.2, §3.2 • Inventory foundation
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