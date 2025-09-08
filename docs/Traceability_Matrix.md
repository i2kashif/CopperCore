# CopperCore ERP — Traceability Matrix

> Links **requirements (PRD v1.5)** → **owner agents** → **acceptance test IDs** → **MCP services**.  
> Purpose: ensure every requirement is implemented, tested, and automated.

---

## Legend
- **PRD Area**: Section from PRD v1.5
- **Owner Agent**: Claude agent responsible
- **AT-ID**: Acceptance Test ID (from PRD §12 or extensions)
- **MCP Services**: Tools used for automation and validation

---

## Matrix

| PRD Area | Owner Agent(s) | Acceptance Tests (AT-IDs) | MCP Services |
|----------|----------------|---------------------------|--------------|
| §2. Users & Factory Scoping | architect-erp, qa-test-engineer | AT-SEC-001 (RLS denies cross-factory), AT-SEC-002 (Global roles allowed) | Supabase MCP, TestSprite |
| §5.1 Product Families | backend-developer, frontend-developer | AT-FAM-001 (invalid schema rejected) | Supabase, MagicUI |
| §5.2 Catalog (SKUs) | backend, frontend, docs-pm | AT-SKU-001 (grammar valid), AT-INV-004 (pending SKU blocks invoice) | Supabase, TestSprite |
| §5.3 Work Orders | backend, frontend, qa | AT-WO-001 (no delete with activity), AT-WO-002 (backdate restricted) | Supabase, TestSprite |
| §5.4 Inventory & Ledger | backend, frontend | AT-STK-001 (return ≤ issue), AT-STK-002 (FM only sees own factory) | Supabase, TestSprite |
| §5.5 Packing Units & Lists | backend, frontend | AT-PL-001 (reprint invalidates label) | Supabase, TestSprite, MagicUI |
| §5.6 Dispatch Note (DN) | backend, frontend | AT-DN-001 (reject frees PUs) | Supabase, TestSprite |
| §5.7 GRN (Inward) | backend, frontend | AT-GRN-001 (short/excess opens discrepancy), AT-GRN-002 (ownership only on posted GRN) | Supabase, TestSprite |
| §5.8 Customers & Invoices | backend, frontend, docs-pm | AT-INV-004 (pending SKU block), AT-INV-005 (invoice contains PK fields) | Supabase, TestSprite |
| §5.9 Machines | backend, frontend | AT-MCH-001 (calibration blocks QC) | Supabase |
| §5.10 QC (QCP-driven) | backend, frontend, architect, qa | AT-QC-001 (FAIL blocks PL/DN), AT-QC-002 (override audited) | Supabase, TestSprite |
| §5.11 Internal Transfer | backend | AT-IT-001 (stock reconciles, no customer docs) | Supabase |
| §6. Regulatory (Pakistan) | docs-pm, backend | AT-INV-005 (compliance fields enforced) | none (design), TestSprite |
| §10. Security & Audit | architect-erp, qa | AT-SEC-001/002 (RLS), AT-AUD-001 (audit tamper-evident) | Supabase |
| §11. Realtime | backend, frontend | AT-RT-001 (UI updates live, scoped) | Supabase Realtime |
| §12. Acceptance Tests | qa-test-engineer | All AT-IDs above | TestSprite |

---

## Notes
- **Coverage Goal:** 100% for critical paths (auth, RLS, DN→GRN, QC, invoicing).  
- **Artifacts:** Each AT-ID must have: test spec, Playwright trace, coverage link in CI.  
- **Change Control:** Schema/RLS → architect-erp approval; PRD changes → docs-pm approval.