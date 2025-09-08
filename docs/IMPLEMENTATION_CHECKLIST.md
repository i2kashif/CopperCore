CopperCore ERP — Implementation Checklist (v1.0)

Work order: go top → bottom. For each feature, complete Backend (DB/RLS/API) → Frontend (UI) → QA (tests) → Seeds/Docs.
Abbreviations: CEO/Director = global visibility; FM/FW/Office = factory-scoped.
Test IDs: create acceptance specs as AT-<AREA>-### matching PRD §12.

⸻

0) Initialize Setup (Foundation)
	•	Repo hygiene: add docs/STACK.md, docs/Traceability_Matrix.md, update README.md.
	•	Env/Secrets: move all keys out of .mcp.json to .env; add .env.example.
	•	MCP: use ${WORKSPACE_ROOT}; remove OS-specific paths; headless Puppeteer.
	•	DB: stand up Postgres/Supabase; migrations folder; baseline schema file.
	•	Seeds: script creates 2 factories, users (CEO, Director, FM, FW, Office), sample families/SKUs/lots/PUs.
	•	RLS harness: JWT fixtures for each role with role, factory_id, user_id.
	•	CI: GitHub Actions with ephemeral DB (service container or Supabase/Neon branch), run migrate + seed + tests, upload artifacts.
	•	DoD: npm run db:migrate && npm run db:seed + CI green on clean clone.

⸻

1) Login & Auth (JWT/RLS baseline)

Backend
	•	Configure Supabase Auth (or custom) to mint JWTs with role & factory_id.
	•	Add SQL helpers: jwt_factory(), user_is_global(), jwt_role().
	•	RLS probe SQL for SELECT/INSERT/UPDATE/DELETE by role.
Frontend
	•	Login page; post-login role/factory routing; “switch factory” only for CEO/Director.
	•	Session store + token refresh; role badges.
QA
	•	AT-SEC-001: cross-factory read denied for non-global.
	•	AT-SEC-002: CEO/Director global read allowed.
DoD: All guarded reads/writes match PRD scoping.

⸻

2) Manage Company (Org primitives)

Backend
	•	Tables: factories(id, code, name, active), users, user_factory_links(role, factory_id).
	•	RLS: CRUD factories/users CEO/Director-only; others read own factory.
	•	Events: factory.created/updated, user.invited/role_changed.
Frontend
	•	CEO dashboard → Manage Company: factories list, create/edit; user invite & role assign; deactivate/reactivate.
QA
	•	AT-MGMT-001: FM cannot create factory/user.
	•	AT-MGMT-002: CEO creates factory; user sees only assigned factory.
DoD: New factory appears; scoping works end-to-end.

⸻

3) Factories (metadata for numbering/scoping)

Backend
	•	Factory code becomes part of document numbers.
	•	FK to all scoped entities; policy immutability of factory_id.
Frontend
	•	Factory settings page: code, address, PK tax fields (used in invoices).
QA
	•	AT-FCT-001: factory code change rotates preview numbers (no retro renumber).
DoD: Factory attributes propagate to numbering & documents.

⸻

4) Users & Roles

Backend
	•	users + user_factory_links CRUD; soft-delete users; audit tables.
	•	Constraints: one primary factory per non-global user.
Frontend
	•	Invite by email; role picker; primary factory selector; deactivate/reactivate.
QA
	•	AT-USR-001: deactivated user blocked at login.
DoD: Role/factory assignment drives RLS as expected.

⸻

5) Product Families (configuration-first)

Backend
	•	product_families(id, name, attributes_schema JSONB, sampling_rules JSONB, tags[]).
	•	Validate attribute schemas; attach default QC plan pointers.
Frontend
	•	Family create/edit; attribute builder (keys, types, units, constraints).
QA
	•	AT-FAM-001: invalid schema rejected; valid schema drives SKU UI.
DoD: Families define the grammar for SKUs & QC sampling.

⸻

6) Catalog (SKUs + grammar + pending flow)

Backend
	•	skus(id, family_id, code, name, attributes JSONB, state ENUM: draft|pending|approved|rejected).
	•	SKU name grammar generator (DB or service) based on family schema.
	•	Transition rules: only CEO/Director approve; audit approved_by/at/reason.
Frontend
	•	Guided SKU composer (tokens from family attrs), live name preview.
	•	Badges by state; “Request Approval” button; “Approve/Reject” screen for CEO/Director.
QA
	•	AT-INV-004: Pending SKU blocks invoicing (later reused).
	•	AT-SKU-001: Grammar respects precision/units.
DoD: Clean SKU creation, governance, and naming consistency.

⸻

7) Stock (Lots, PUs, Ledger, opening balances)

Backend
	•	Tables: lots, packing_units, inventory_ledger (typed entries: open, issue, return, produce, adjust).
	•	Constraints: returns ≤ issues per lot; immutability of posted rows.
	•	RLS: lot/PU reads scoped; writes by FM/FW in own factory.
Frontend
	•	Opening balance wizard by factory; lot/PU views with search/filters.
QA
	•	AT-STK-001: return > issue rejected.
	•	AT-STK-002: FM can view only own factory lots.
DoD: Accurate stock positions per factory.

⸻

8) Work Orders (RM issue→production→FG receipt)

Backend
	•	work_orders with statuses; tables for RM issues/returns, production logs, scraps, FG receipts.
	•	Backdating CEO/Director only with reason & audit.
	•	Events: wo.material_issued, wo.production_logged, wo.fg_received.
Frontend
	•	Create WO (family/SKU targets), issue/return UI, production entry, scrap, FG receipt.
QA
	•	AT-WO-001: can’t delete WO with transactions (must cancel).
	•	AT-WO-002: backdate restricted & audited.
DoD: Full WO lifecycle with constraints enforced.

⸻

9) Packing Units & Packing Lists (labels)

Backend
	•	Generate PUs from FG; PU label print with reprint invalidation record.
	•	packing_lists (PL) link PUs; mass/weights checks; barcode/QR payload.
Frontend
	•	PU view → “Add to PL”; PL builder; label print modal; reprint flow with reason.
QA
	•	AT-PL-001: reprint invalidates prior label (audit entry).
DoD: PUs are traceable & printable; PLs ready for shipment.

⸻

10) Dispatch Note (Outward) — merged Gate Pass/DC

Backend
	•	dispatch_notes with statuses: draft→posted→shipped→rejected.
	•	Soft-lock PUs on shipped; rejected unblocks PUs.
	•	Numbering on Finalize (see §Numbering).
Frontend
	•	Create from PL; DN summary; reject flow (with reason).
QA
	•	AT-DN-001: reject DN frees PUs; numbering is idempotent on retry.
DoD: DN governs outbound movements and locks.

⸻

11) GRN (Inward) — DN-first, inter-factory handshake

Backend
	•	grn created from source DN (primary) with idempotency_key; accept short/excess → grn_discrepancy.
	•	On received, unlock PUs & transfer ownership inter-factory.
Frontend
	•	“Create GRN from DN” flow; discrepancy capture; resolve workflow.
QA
	•	AT-GRN-001: short/excess opens discrepancy.
	•	AT-GRN-002: inter-factory transfer changes ownership only on posted GRN.
DoD: DN→GRN closed-loop with discrepancies tracked.

⸻

12) Internal Transfer (non-customer moves)

Backend
	•	Simplified DN/GRN pair within company; optional PL.
Frontend
	•	“Transfer to factory” wizard.
QA
	•	AT-IT-001: transfer doesn’t touch customer docs; stock reconciles both sides.
DoD: Clean inter-site logistics.

⸻

13) Machines (production/packing/testing)

Backend
	•	machines(type, family_tags, calibration_due_at); joins to lots/tests.
	•	Calibration overdue blocks QC (overrideable).
Frontend
	•	Machine registry; calibration tracker; warnings.
QA
	•	AT-MCH-001: overdue calibration blocks test run unless override by CEO/Director.
DoD: Machines affect QC gates as per PRD.

⸻

14) Testing / QC (QCP, sampling, overrides)

Backend
	•	qc_plans per family/SKU; qc_tests(definitions), qc_runs(results, outcome PASS/WARN/FAIL).
	•	Shipment Block Matrix: FAIL/HOLD block PL/DN; WARN requires override.
	•	Override: role-gated, reason, emits qc.override.
Frontend
	•	Test entry UI; plan selection; certificates; override dialog (CEO/Director).
QA
	•	AT-QC-001: FAIL blocks PL/DN.
	•	AT-QC-002: override emits event + audit.
DoD: QC rules actively gate logistics.

⸻

15) Pricing & Invoices (compliance)

Backend
	•	price_lists (stateful, versioned); invoices with Sec. 23 fields; Pending SKU hard-block.
	•	Export CSV/JSON/PDF; placeholders for ATL check & e-invoice QR.
Frontend
	•	Invoice editor; print view; “pending SKU” guardrails with clear reason.
QA
	•	AT-INV-004: pending SKU blocks invoice post.
	•	AT-INV-005: invoice contains mandated PK fields.
DoD: Legally compliant invoices; pending SKU governance.

⸻

16) Numbering & Fiscal Year (PKT)

Backend
	•	Per-module sequences: DN-{FY24-25}-{FAC}-{000001} (per-factory).
	•	Reset at FY start (1 Jul, PKT); reserve on Finalize; idempotency on retry.
Frontend
	•	Preview numbers (not committed) until finalize.
QA
	•	AT-NO-001: sequence resets correctly at FY rollover; retry preserves same number.
DoD: Predictable, compliant numbers.

⸻

17) Realtime & Cache Invalidation

Backend
	•	Emit topics: dn.status_changed, grn.discrepancy_*, pu.reprinted, qc.result_posted, price_list.updated.
Frontend
	•	Subscribe by factory/role; optimistic updates where safe; refetch on events.
QA
	•	AT-RT-001: UI lists refresh on event without full reload.
DoD: Users see the world change live, scoped correctly.

⸻

18) Reports & Traceability

Backend
	•	Views/SQL for: Inventory by factory, PU→Lot→WO lineage, DN/GRN ledgers, QC KPI, Pending SKUs.
Frontend
	•	Filters/exports; print-friendly.
QA
	•	AT-RPT-001: PU lineage shows end-to-end chain.
DoD: Answers ops & audit questions fast.

⸻

19) QA Automation (Acceptance/E2E)
	•	Create /tests/acceptance/AT-*.spec.ts matching each AT ID above.
	•	Role-matrix tests (CEO/Director/FM/FW/Office) using JWT fixtures.
	•	Upload Playwright traces & coverage in CI.
DoD: CI runs all ATs, artifacts uploaded.

⸻

20) Observability & Ops
	•	Structured logging; error boundaries in UI; health checks.
	•	DB backups; migration runbook; rollback plan.
DoD: Basic runbooks + resilience in place.