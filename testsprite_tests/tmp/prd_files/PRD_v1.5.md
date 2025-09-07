CopperCore ERP — Product Requirements Document (PRD)

Version: 1.5 (Full, merged)

Owner: CEO/Director (CopperCore)

Audience: Product, Engineering, QA, Operations

Goal: A factory‑scoped ERP for wires/cables/conductors with secure logistics, family‑driven product specs, PU‑level traceability, Pakistan fiscal/tax controls, a clean separation of logistics vs. pricing, Supabase‑backed platform services, and realtime UI updates with fine‑grained cache invalidation.

---

## Table of Contents
	1.	Purpose & Scope
	2.	Users, Roles & Factory Scoping
	3.	Global Concepts
	•	3.1 Product Family (configuration‑first)
	•	3.2 SKU (Variant)
	•	3.3 Inventory Lot / Packing Unit (PU)
	•	3.4 Machines
	•	3.5 Testing / QC (QCP)
	•	3.6 Customer & Invoice Alignment
	•	3.7 Realtime & Cache Invalidation
	4.	Numbering & Series (Human Document Numbers)
	5.	Modules & Requirements
	•	5.1 Product Families
	•	5.2 Catalog (SKUs)
	•	5.3 Work Orders (WO)
	•	5.4 Inventory & Ledger
	•	5.5 Packing Units (PU) & Packing Lists (PL)
	•	5.6 Dispatch Note (Outward) — Gate Pass/Delivery Challan merged
	•	5.7 GRN (Inward) — Inter‑factory friendly design (DN‑first, PL fallback)
	•	5.8 Customers, Pricing, Invoices
	•	5.9 Machines
	•	5.10 Testing / QC (QCP‑driven)
	•	5.11 Internal Transfer (Domestic)
	•	5.12 Manage Company (Factories, Users, Opening Stock)
	6.	Regulatory & Fiscal Controls (Pakistan)
	7.	Activity & Audit (Localized “Who Did What”)
	8.	Business Rules & Validations (Cross‑Module)
	9.	Numbering, Sorting & Naming (Conventions)
	10.	Security, Performance & Data Integrity
	11.	Platform Architecture & Hosting (Supabase) (NEW)
	12.	Acceptance Tests (High‑Level)
	13.	Risks & Mitigations
	14.	Success Metrics
	15.	Appendix: Accounting Posting Map (Future/Optional)

---

## 1) Purpose & Scope
	•	Model product families with configurable attributes (e.g., numeric enamel/PVC thickness) that drive identity, inventory, packing, invoices, and QC.
	•	Operate Work Orders end‑to‑end: issue/return RM (return ≤ issued by lot), production logs (machine required), scrap/rework, FG receipt with TBD attribute finalization.
	•	Manage Inventory Lots & Packing Units (PUs) with barcodes. Primary barcode is PU:; optional GS1 SSCC alias. No business attributes inside barcodes; attributes are server‑looked up.
	•	Build Packing Lists and ship via Dispatch Notes (merged Gate Pass/Delivery Challan; no prices).
	•	Handle Inward GRN optimized for inter‑factory transfers from DN‑first (fallback to finalized PL where DN unavailable) with discrepancy capture.
	•	Generate Invoices securely from completed dispatches; pricing lives in Price Lists and Customers (with NTN/STRN as applicable).
	•	Enforce factory scoping so scoped users only see their site’s data (global roles exempt). Provide Manage Company for factories, users, and opening stock.
	•	Configurable Testing/QC via QCPs with sampling rules and shipment blocking matrix.
	•	Family‑aware UIs: show only relevant columns per family configuration.
	•	Realtime UX: pages auto‑update on relevant changes (fine‑grained invalidation, no heavy refetch) via Supabase Realtime.
	•	Out of scope (for now): MRP planning, CRM pipeline, full tax e‑filings, multi‑entity accounting.

---

## 2) Users, Roles & Factory Scoping

2.1 Roles
	•	CEO (global): Manage families, machines, SKUs, pricing, factories, users; approvals; invoices; schema edits; override blocks (with audit).
	•	Director (global): Create WOs/SKUs; manage/finalize invoices; view pricing; (configurable) dispatch approval gate.
	•	Factory Manager (FM) (scoped): Accept WOs; issue/return RM; approve scrap; finalize TBD attrs; receive FG; manage packing; verify dispatch; dispatch/complete (policy‑based). May request on‑the‑fly SKU creation and proceed (see §5.3, §5.2).
	•	Factory Worker (FW) (scoped): Create PUs/PLs; scan operations; draft dispatch notes; no verify/approve.
	•	Office (scoped/global): Manage customers; draft/mark invoices; no dispatch approvals.

2.2 Factory linkage & visibility
	•	Each user has assigned_factories[]. FM/FW typically 1 factory; Office configurable; CEO/Director global.
	•	All list/detail queries are factory‑filtered unless user is global.

2.3 Backdating controls
	•	Backdating of WO logs, GRNs, Invoice posting dates allowed only for CEO/Director, with mandatory reason, approver, and full audit (timestamp, IP/UA).

---

## 3) Global Concepts

3.1 Product Family (configuration‑first)
	•	Attributes[]: { key, label, type:number|text|enum, unit?, level: sku|lot|unit, decideWhen: wo|production, showIn: [wo, inventory, packing, invoice], validation: {min,max,step|enumOptions}, allowAppendOptions?: boolean }
	•	SKU Naming Rule uses only level=sku attributes.
	•	Examples
	•	Enamel Wire — sku: metal, rod_diameter_mm, enamel_thickness_um; lot: enamel_type (enum, production‑decided, appendable), nominal_resistance_ohm_km (measured)
	•	PVC Cable — sku: metal, conductor_area_mm2, cores, insulation_thickness_mm; lot: pvc_type (enum, production‑decided), measured spark/adhesion

3.2 SKU (Variant)
	•	Identity = family + chosen sku attributes (immutable). Bulk generation supported.
	•	TBD attributes are not part of the SKU identity; they are lot‑level and finalized at FG receipt.

3.3 Inventory Lot / Packing Unit (PU)
	•	Lot: batch of a SKU; holds lot attributes (machine, enamel/pvc type, QC results, etc.).
	•	PU: reel/coil/carton with net/gross/tare; belongs to a Lot. Primary barcode: PU:<id> (Code‑128/QR). Optional external GS1 SSCC stored as alias (unique).

3.4 Machines
	•	{ type: Production|Packing|Testing, factoryId, familyTags?, calibration_due }. Calibration overdue blocks QC (override by CEO/Director with audit).

3.5 Testing / QC (QCP)
	•	Test Definitions per family/SKU: fields, units, thresholds, sampling plan, required stages (Receiving, In‑Process, Pre‑Dispatch).
	•	Test Runs: readings + PASS/FAIL/HOLD; testing machine; photos; NCR on FAIL/HOLD.
	•	Shipment Block Matrix: Lot with FAIL/HOLD cannot be packed/dispatched unless overriden by CEO/Director (audited).
	•	QC Certificates: system can generate per‑lot/per‑PU certificates with measured results, calibration references, and sign‑off.

3.6 Customer & Invoice Alignment (NEW)
	•	Sales Order/WO Policy: If any attribute materially affects form/fit/function for the customer, capture expected value in SO (or mark “Supplier’s option within spec”).
	•	Invoice/Delivery Content: Attributes marked showIn: invoice (e.g., enamel_type, conductor_area) are printed on DN/Invoice line descriptions for clarity.
	•	Customer Cross‑Reference: Maintain mapping: { customer_sku_code, customer_desc } ↔ { internal_sku_id } with validity dates per customer.
	•	TBD Resolution: For WOs with TBD attributes, Sales can attach a “tolerance/acceptance note”. Invoices for such orders must show the finalized attribute(s) in description.
	•	Blockers: Invoices cannot post if required customer cross‑ref is missing (configurable per customer).

3.7 Realtime & Cache Invalidation (NEW)
	•	Goal: Pages auto‑update for concurrent users (e.g., CEO approves while FM is packing) with small scope updates.
	•	Mechanism: Supabase Realtime (Postgres logical replication/websockets) subscribed to entity‑scoped channels.
	•	Channel keys: factory:<id>, doc:<type>:<id>, list:<type>:<factoryId>.
	•	Payload: {type, id, factoryId, action: 'create|update|delete|approve|reject', changedKeys:[], version, ts}.
	•	Frontend Policy: Use a normalized client cache with targeted query invalidation by key:
	•	On doc:<type>:<id> event: refetch only that record; update optimistic caches.
	•	On list:<type>:<factoryId> with action=create|delete: refetch paged list heads only (no full reload).
	•	Coalesce bursts (debounce 250–500ms) to minimize chatter.
	•	Presence & Broadcast: Optional channels show who is viewing/editing; lightweight banners warn on concurrent edits; no hard locks by default.
	•	Concurrency Control: Each mutable row has version/updated_at. Writes include precondition; server returns 409 Conflict if stale; client refetches and retries.
	•	Cost Control: Subscribe only to channels visible to the user’s factories and current pages; auto‑unsubscribe on route leave; batch summary events for bulk ops.

---

## 4) Numbering & Series (Human Document Numbers)
	•	Dual identifiers: Immutable internal ID; user‑visible series number.
	•	Series key: (DocType, Factory, FiscalYear) unless configured otherwise.
	•	Format: PREFIX + SEQ (e.g., {FAC}-{FY2}-000123). {FY2} = last two digits of fiscal year.
	•	Reset: Annual for WO/PL/GRN/DN; Invoices never reset (or long padding). Fiscal Year fixed to 1 Jul – 30 Jun.
	•	Assignment: Operational docs → on Create (configurable). Invoices → on Finalize. Atomic reservation; cancelled operational docs may leave gaps (audited).

---

## 5) Modules & Requirements

5.1 Product Families
	•	Create/Edit Family: Code, Name, Attributes[], SKU Naming Rule; optional default routing & packing rules.
	•	Enum attributes may allow append options (controlled by CEO/Director approval if flagged restricted).
	•	Acceptance: Numeric ranges & option uniqueness enforced; schema version recorded.

5.2 Catalog (SKUs)
	•	Generate Variants: select family; choose grids of sku values; preview code/name; create.
	•	On‑the‑Fly SKU (NEW): If FG receipt finalizes a new sku‑identity (not in catalog):
	•	FM can “Request & Proceed”: system creates Pending SKU placeholder (status=PENDING_APPROVAL) and assigns it to the FG Lot.
	•	Packing/Dispatch may proceed if policy allows (toggle per family/customer).
	•	Invoicing is blocked until SKU is approved. CEO/Director can approve (converts placeholder to real SKU; cascades updates) or reject (forces lot reclassification before any invoice).
	•	Acceptance: Duplicate identities blocked; naming rule uses only sku attributes; pending SKUs visible in Admin queue.

5.3 Work Orders (WO)
	•	Create WO (CEO/Director): Header: Factory, Assigned Manager, Due Date, Priority, optional Customer (MTO), Notes. Lines: choose SKU (all wo attrs known) or Family + sku attrs with TBD for production attrs. Targets: qty + tolerance.
	•	States: Draft → Accepted (FM) → In Production → Completed (+ admin: Disabled, Cancelled).
	•	Transactions:
	•	Issue Materials (FM): select RM Lots, qty; cannot issue > available; factory must match.
	•	Return Materials (FM): bound to previous issues by lot; Returnable = Issued − Returned; cannot exceed. Reasons: Unused/Excess/Quality.
	•	Production Log (FM): produced qty, Production machine (required), time/shift; scrap/rework entries.
	•	Receive FG (FM): finalize TBD attrs; On‑the‑Fly SKU Request & Proceed flow as per §5.2; creates FG Lot with lot attributes & QC status.
	•	WO Admin:
	•	Delete: only if no activity. Else Cancel (void; no further consumption/production; returns allowed).
	•	Disable/Enable: Disabled blocks new consumption/production/FG; returns allowed.
	•	Edit lines/quantities: cannot remove a line with activity. Decrease target ≥ max(Produced, Packed, Dispatched). Increase allowed.
	•	Forced Closure (NEW): FM may Short‑Close a line/WO (reason required) when targets cannot be met (e.g., yield loss). System auto‑recalculates open qty to produced.
	•	Acceptance: Returns never exceed issued by lot; FG receipt blocked until production‑decided attrs finalized; all edits audited; short‑close requires reason.

5.4 Inventory & Ledger
	•	Lots: { skuId|pendingSkuId, lotCode, qty/UoM, attributes, produced_on_machine, qc_status, factoryId }.
	•	Ledger: Auto entries for Issue/Return/Receive FG/Adjust/Transfer; factory‑scoped.
	•	Family‑aware tables: Inventory shows only attributes with showIn: inventory.
	•	In‑Transit (NEW): Internal dispatch creates an in‑transit ledger move; stock is not counted at source or destination until GRN; separate “In‑Transit” view for reconciliation.
	•	Acceptance: Indexes on (factoryId,status,skuId,lotId,createdAt); in‑transit entries must reconcile within policy SLA.

5.5 Packing Units (PU) & Packing Lists (PL)
	•	PU: Create from lot: net/gross/tare, reel no., optional packing machine, label print.
	•	Label Reprint & Invalidation (NEW): Authorized users may reprint labels; system voids the previous barcode mapping (old codes become inactive) and logs reason.
	•	PL (requires Customer):
	•	Scanner‑first: add/remove PUs by scanning (accept PU id or SSCC alias). Undo/Remove last scan and Remove by Scan supported.
	•	Live tally vs. WO targets; group cards by (SKU + key attributes); show total reels, total net kg.
	•	Mis‑scan Handling: Unknown/duplicate scans prompt operator with reason; duplicates prevented.
	•	Acceptance: PL cannot include blocked QC lots; PL edit history logged.

5.6 Dispatch Note (DN) — Gate Pass/Delivery Challan merged
	•	No Prices.
	•	Verification & Approval: FM verifies; CEO/Director optional gate per policy/threshold.
	•	Rejection (NEW): If DN is rejected at verification, it returns to Draft; linked PUs revert to “available for packing”; reason required.
	•	Partial Dispatch: Allowed; remaining PUs stay on PL or in stock. Multiple DNs can reference one PL; system keeps linkage.
	•	Acceptance: DN references PL(s) and WO(s); prints customer cross‑ref SKUs where applicable.

5.7 GRN (Inward) — DN‑first, PL fallback
	•	DN‑first: Scan DN to preload GRN; receiver confirms PUs/qty.
	•	PL fallback: For external suppliers or missing DN, use finalized PL to draft GRN.
	•	Discrepancy Management (NEW): Capture Over/Short/Damaged per PU/line; create Discrepancy Record with statuses (Open → Under Review → Resolved) and actions (adjust source/destination, create return/replacement).
	•	Internal Rejection (NEW): Destination factory may Reject received items (reason). System creates auto Return DN back to source or flags for disposal per policy.
	•	Acceptance: GRN posts only when all discrepancies have a pending action; audit includes who received, who reviewed discrepancies.

5.8 Customers, Pricing, Invoices
	•	Customers: Names, addresses, NTN/STRN, payment terms, currency, tax profile, customer SKU cross‑refs (code + description, validity dates).
	•	Price Lists: Per customer/segment; effective dates; currency; tax inclusive/exclusive flag.
	•	Invoices: Generated from completed DN(s); line descriptions include attributes with showIn: invoice.
	•	Taxes (PK GST Ready) (NEW): Default GST 17% tax code; per‑line tax code; invoice totals show tax separately; support withholding flags (phase‑2).
	•	Multi‑Currency Ready (NEW): Invoice currency, rate (daily SBP or manual), show foreign amount + PKR equivalent; store rate snapshot.
	•	Customer Alignment (NEW): Print customer SKU code + description alongside CopperCore SKU; validate Expected TBD attrs from SO against actual; block posting on critical mismatch.
	•	Posting Blocks: Missing required cross‑ref, pending SKU approval, or QC HOLD/FAIL block invoice posting.
	•	Returns/Credit Notes (NEW): Sales returns against DN/Invoice with reason codes (quality, over‑supply); auto stock effect (to quarantine or saleable per QC).

5.9 Machines
	•	See §3.4; add Calibration Logs and certificates upload; alerts before due date.

5.10 Testing / QC (QCP‑driven)
	•	Enforce required QCPs by stage; Certificate generation and attachment to dispatch docs where required by customer.

5.11 Internal Transfer (Domestic)
	•	Create Internal DN; inventory moved to In‑Transit; GRN at destination completes transfer.
	•	Valuation: Transfer at book/standard cost (accounting only; not on ops docs).

5.12 Manage Company (Factories, Users, Opening Stock)
	•	CEO/Directors can create factories and users; assign users to factories; add opening stock by lot with audit.

---

## 6) Regulatory & Fiscal Controls (Pakistan)
	•	Invoice Fields: Unique sequential number; date; seller name/address/STRN; buyer name/address/NTN/STRN; description, qty, value, GST rate/amount; totals.
	•	Record Retention: Electronic records retained ≥ 6 years; exportable audit logs.
	•	Fiscal Year: Fixed to 1 Jul–30 Jun.
	•	E‑Invoicing Connector Slot: Design placeholder for future FBR integration (QR, real‑time reporting) — not built now.

---

## 7) Activity & Audit (Who Did What)
	•	Per‑entity append‑only activity: {actorId, action, before, after, ts, ip, ua}.
	•	Tamper‑Evident (NEW): Each audit record stores a hash(chain) linking previous record; admin edits create new records; deletion disabled.

---

## 8) Business Rules & Validations (Cross‑Module)
	•	No silent data loss: deletes blocked once transactional links exist; use Cancel/Disable with audit.
	•	Factory scope enforced in all queries and writes.
	•	QC blocks respected: FAIL/HOLD lots cannot be packed/dispatched.
	•	Pending SKU: allows operations to continue (per policy) but blocks invoicing until approval.
	•	Document state machine: consistent transitions enforced; rejections require reasons.

---

## 9) Numbering, Sorting & Naming (Conventions)
	•	Human numbers include FY where applicable; sort lists by createdAt DESC, then human number.
	•	SKU naming uses only sku‑level attributes; lot codes are factory‑scoped with FY prefix.

---

## 10) Security, Performance & Data Integrity
	•	Auth: Supabase Auth (email/phone/SSO ready). Roles mapped to app roles; per‑factory access via claims.
	•	RLS: Postgres Row Level Security for factory scoping and role‑based access; policies per table including customer portal read scopes.
	•	Encryption: TLS in transit; encrypted storage for docs; signed URLs for file delivery.
	•	Indexes: On (factoryId, status, skuId, lotId, createdAt); partial indexes for open items.
	•	Concurrency: updated_at/version optimistic locking; 409 conflict strategy.
	•	Backups: Daily automated backups; Point‑in‑Time Recovery (PITR) per plan tier; retention ≥ 6 years for fiscal compliance.
	•	Tamper‑evident audit: Append‑only audit with hash chaining; admin edits create new entries (no destructive changes).

---

## 11) Platform Architecture & Hosting (Supabase) (NEW)
	•	Core: Supabase Postgres (managed), Auth, Storage, Realtime. API via PostgREST; custom API (Node/Django in Docker) for complex workflows and integrations.
	•	Runtime Placement: Host API/UI on Fly.io or Render (Docker images); pick regions close to DB; autoscale conservatively.
	•	Realtime: Subscribe to row‑level changes on key tables (WO, PL, DN, GRN, Lot, PU, Invoice) using entity‑scoped channels and minimal payloads (see §3.7).
	•	Cache Strategy: Client keeps normalized entity store; on event, invalidate only affected queries; incremental fetch for lists.
	•	Documents: Supabase Storage for PDFs (DN, Invoice, QC certs) with signed URLs and lifecycle rules.
	•	Branching/Env: Dev/Staging/Prod databases; seed data via migrations; optional database branching for previews.
	•	CI/CD: GitHub Actions deploy migrations and web/app containers; feature flags for risky changes.
	•	Cost Control: Limit realtime subscriptions to active views/factories; throttle events; server emits summary events for bulk ops.

---

## 12) Acceptance Tests (High‑Level)
	1.	WO Materials Integrity: Cannot return > issued per lot; attempts return 422 with hint.
	2.	On‑the‑Fly SKU: FM finalizes new attribute → Pending SKU; packing allowed (policy=ON); invoice blocked; after CEO approve → invoice posts.
	3.	Lost Barcode: Operator reprints PU label; old barcode invalid; new scans resolve to same PU; audit records reprint.
	4.	DN Reject: DN rejected → returns to Draft; PUs become available; reason logged; realtime update reaches packing screen.
	5.	GRN Discrepancy: Short receipt creates Discrepancy Record; stock reflects received qty; resolution adjusts source/destination.
	6.	QC Block: Lot with FAIL cannot be added to PL; attempt shows error; override by CEO logs event and requires rationale.
	7.	Realtime Scope: CEO edits price list → only price list views update; no full app reload; list heads revalidated.

---

## 13) Risks & Mitigations
	•	Variant Explosion:
	•	Risk: Excess SKUs due to over‑definition.
	•	Mitigation: Keep identity small; use lot attributes for production/tolerance details; Pending SKU Request & Proceed to prevent bottlenecks; pre‑create common variants.
	•	Customer/Invoice Misalignment:
	•	Risk: Customer orders generic spec; invoice shows specific variant unknown to them.
	•	Mitigation: Capture expected/tolerance in SO; print key attributes on DN/Invoice; maintain customer SKU cross‑refs; block invoice if critical cross‑ref missing.
	•	Traceability Gaps:
	•	Risk: Missing link from lot/PU to invoice.
	•	Mitigation: Ensure DN/Invoice store PU/lot refs; QC certificates attach to dispatch.
	•	Lost/Duplicate Barcodes:
	•	Risk: Stuck PUs or scan ambiguity.
	•	Mitigation: Reprint flow voids old codes; duplicate scan guard; SSCC uniqueness enforced.
	•	Over‑Complication at FM:
	•	Risk: FM overloaded with approvals.
	•	Mitigation: Policy flags to delegate routine approvals; clear dashboards and realtime notifications.
	•	Realtime Cost/Noise:
	•	Risk: Excessive websocket traffic.
	•	Mitigation: Scoped channels; debounce; summary events; selective subscriptions.

---

## 14) Success Metrics
	•	Data Integrity: 0 incidents of returns > issues; 0 orphan PUs on PL/DN.
	•	Throughput: Avg time from WO Accept → DN Complete within target; reduction after realtime.
	•	Quality: % lots with complete QC certificate at dispatch ≥ 99%.
	•	Customer Alignment: < 0.5% invoices flagged due to spec/code mismatch.
	•	Ops UX: Scanner error rate < 1%; median PL build time per 10 PUs under target.

---

## 15) Appendix: Accounting Posting Map (Future/Optional)
	•	Stock Moves: Issue/Return/Receive/Transfer to inventory accounts; internal transfer valuation at standard cost.
	•	Invoice: Revenue, GST output tax, FX revaluation placeholders; Withholding tax (phase‑2).