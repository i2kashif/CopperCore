# CopperCore — Database Guide

This guide explains how data is persisted and how to reason about the DB when you take back control.

---

## 1) Architecture at a Glance

- **PostgreSQL (Supabase)** with:
  - **RLS** using JWT claims: `role`, `factory_id`, `user_id`
  - **Sequences** for document numbering (FY-aware)
  - **Triggers** for audits, label reprint invalidation, etc.
  - **Realtime** on key tables for UI updates

- **Access paths**
  - **Frontend:** Supabase anon key → RLS enforced by `factory_id`
  - **Backend:** Service role key for privileged ops (DN→GRN finalize, QC override, numbering reservations)

---

## 2) How Data Flows (Common Paths)

### A) Work Order → Stock
1. Create WO (factory-scoped)
2. Issue RM (ledger entries)
3. Log production & FG receipts (lots created/updated)
4. Generate PUs from FG

**Guards:** returns ≤ issues, backdating audited, RLS by factory

### B) PL → Dispatch Note (DN)
1. Build Packing List (select PUs)
2. Finalize DN → **assign number** and **lock PUs** at ‘shipped’

**Guards:** DN numbering idempotent; reject DN → unlock PUs

### C) DN → GRN (Inter-factory)
1. Create GRN **from DN** (primary route) with `idempotency_key`
2. Accept short/excess → open `grn_discrepancy`
3. On **posted** GRN → transfer ownership to receiving factory

**Guards:** ownership transfers only on posted GRN; discrepancies tracked

### D) QC Gating
- QC plan per family/SKU
- Test runs → PASS / WARN / FAIL
- FAIL/HOLD blocks PL/DN; WARN requires CEO/Director override (audited)

---

## 3) Persisting Data Yourself

### Connecting
- **Backend:** read `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env
- **Frontend:** read `SUPABASE_URL` + `SUPABASE_ANON_KEY`

### Writing
- Prefer **RPC/functions** or backend services for complex finalization (DN finalize, GRN post) to keep idempotency and audits centralized.
- For simple CRUD (e.g., families, SKUs), use direct table inserts via Supabase client (RLS enforced).

### Transactions
- Use transactional blocks for multi-step operations:
  - Reserve number → write document → write audit → emit event
- If anything fails, **rollback** and release reservations

### Idempotency
- Include a **client-supplied `idempotency_key`** on finalize endpoints (DN/GRN) to avoid double posts on retries.

---

## 4) Migrations & Policies

- **Tables** defined in `/db/schema` (TS) → generate SQL via `npm run db:gen`
- **Policies/triggers** live as clear `.sql` files in `/db/policies`
- A **migration batch** includes:
  1. Generated SQL (DDL)
  2. Policy & trigger SQL (`\i db/policies/*.sql` include)
  3. Grants & helper functions

**Apply:** `npm run db:apply`  
**Seed:** `npm run db:seed`

---

## 5) RLS & Roles

- **JWT Claims**
  - `role`: `CEO` | `DIRECTOR` | `FM` | `FW` | `OFFICE`
  - `factory_id`: current factory scope (global roles can switch)
- **Helpers**
  - `user_is_global()` → CEO/Director
  - `jwt_factory()` → current factory id

**Pattern (example)**
```sql
CREATE POLICY invlot_read
  ON inventory_lots
  FOR SELECT
  USING (user_is_global() OR factory_id = jwt_factory());