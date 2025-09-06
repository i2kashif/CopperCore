/docs/prompts/optimistic_locking.md

# Playbook: Optimistic Locking (409) — `version` + `updated_at`

> **Goal**  
Add lightweight, deterministic optimistic concurrency so **stale writes** fail with **409 Conflict**, clients **refetch → reapply → retry**, and realtime consumers can **drop stale events** using the row `version`.

---

## Context (PRD-v1.5.md §3.7 Concurrency)
- Every mutable row carries:
  - `version int` (starts at 1; **increments on every UPDATE**)
  - `updated_at timestamptz` (**now()** on write)
- Server rejects stale updates; client handles **409 → refetch → retry**.
- Realtime payloads should include `version` so the UI ignores out-of-order updates.

---

## Preconditions
- Target tables: `{{TABLES}}` (list each table explicitly).
- API layer supports conditional updates:
  - **Option A (PostgREST):** constrain with `?id=eq.{id}&version=eq.{v}` and use `Accept: application/vnd.pgrst.object+json` to force single-row semantics.
  - **Option B (Custom API):** SQL `UPDATE ... WHERE id = $1 AND version = $2 RETURNING *`.
- RLS policies already enforced (see `rls_policy.md`); triggers must not bypass RLS.

---

## Steps (Plan Mode)

### 1) Migration (idempotent)
- Add columns if missing:
  - `version integer not null default 1`
  - `updated_at timestamptz not null default now()`
- Create a **BEFORE UPDATE** trigger that bumps both fields.
- Backfill `updated_at` on legacy rows.
- (Optional) Add a **partial index** if you filter frequently by `updated_at` for feeds.

### 2) API contract
- **Preconditioned update**:
  - Match on `(id, version)`; if **0 rows** updated, **map to 409 Conflict**.
- **Response**:
  - Return the **new row** (includes incremented `version`).
  - Emit realtime event with `version` for clients.

### 3) Client behavior
- On write: send the **current version** you hold.
- On **409**: `GET` fresh row → reapply local patch → retry.
- In realtime handlers: if `evt.version < cached.version`, **drop** event (see `realtime_cache_invalidation.md`).

### 4) Tests
- Two-writer race: writer A updates to v2; writer B (still on v1) gets **409**; B refetches and succeeds with v2.
- Verify `updated_at` monotonicity and `version` increments by **exactly 1** per write.
- Ensure **RLS** still applies (updates from the wrong factory are denied independent of version).

---

## Deliverables
- `infra/migrations/{{ts}}_optimistic_locking.sql`
- `apps/api/src/{{module}}/update.ts` (or PostgREST request example)
- `tests/integration/optimistic_locking.test.ts`

---

## SQL Template (safe & idempotent)
```sql
-- Add columns idempotently
alter table {{TABLE}} add column if not exists version integer not null default 1;
alter table {{TABLE}} add column if not exists updated_at timestamptz not null default now();

-- Trigger function: bump version + updated_at on any UPDATE
create or replace function cc_bump_version_updated_at() returns trigger
language plpgsql as $$
begin
  new.version := coalesce(old.version, 1) + 1;
  new.updated_at := now();
  return new;
end;
$$;

-- Attach trigger if missing
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'cc_bump_{{TABLE}}') then
    create trigger cc_bump_{{TABLE}}
    before update on {{TABLE}}
    for each row execute function cc_bump_version_updated_at();
  end if;
end$$;

-- (Optional) Backfill updated_at for legacy rows
update {{TABLE}} set updated_at = now() where updated_at is null;

-- (Optional) For activity feeds, consider:
-- create index if not exists idx_{{TABLE}}_updated_at on {{TABLE}}(updated_at desc);

Note: This trigger pattern centralizes the increment, preventing clients from manually bumping version.
```

---

## API Examples

Option A — PostgREST (Supabase REST)
	•	PATCH with row precondition and single-object expectation:

PATCH /rest/v1/{{TABLE}}?id=eq.{{ID}}&version=eq.{{VERSION}}
Accept: application/vnd.pgrst.object+json
Prefer: return=representation
Authorization: Bearer {{JWT}}

{ /* JSON patch */ }

	•	On success: 200 with the updated row (now version = VERSION + 1).
	•	On stale version: PostgREST will return 404 (no matching row) under application/vnd.pgrst.object+json.
Map 404 → 409 Conflict in your client, with guidance to refetch.

Option B — Custom API (Node/TS)

// apps/api/src/{{module}}/update.ts (pseudo)
import { z } from 'zod';
import { pool } from '../db';

const Patch = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  // ... domain fields to patch
});

export async function updateHandler(req, res) {
  const { id, version, ...patch } = Patch.parse(req.body);

  // Build SET clause safely
  const fields = Object.keys(patch);
  const set = fields.map((k, i) => `"${k}" = $${i + 3}`).join(', ');
  const params = [id, version, ...fields.map((k) => patch[k])];

  const sql = `
    update {{TABLE}}
    set ${set}
    where id = $1 and version = $2
    returning *;
  `;

  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    return res.status(409).json({ error: 'Conflict', hint: 'Stale version. Refetch and retry.' });
  }
  return res.json(rows[0]);
}


---

## Test Skeleton (integration)

// tests/integration/optimistic_locking.test.ts
import { db } from '../helpers/db';

describe('Optimistic locking', () => {
  let row: any;

  beforeAll(async () => {
    row = await db.create('{{TABLE}}', { name: 'alpha' }); // returns { id, version: 1, ... }
  });

  it('second writer gets 409 and succeeds after refetch', async () => {
    const firstRead = await db.get('{{TABLE}}', row.id);   // version 1
    const secondRead = await db.get('{{TABLE}}', row.id);  // version 1

    // Writer A updates to v2
    const a = await db.update('{{TABLE}}', { id: row.id, version: firstRead.version, name: 'a' });
    expect(a.version).toBe(2);

    // Writer B attempts with stale v1
    await expect(
      db.update('{{TABLE}}', { id: row.id, version: secondRead.version, name: 'b' })
    ).rejects.toMatchObject({ status: 409 });

    // Refetch → retry
    const fresh = await db.get('{{TABLE}}', row.id); // version 2
    const b = await db.update('{{TABLE}}', { id: row.id, version: fresh.version, name: 'b' });
    expect(b.version).toBe(3);
    expect(new Date(b.updated_at).getTime()).toBeGreaterThan(new Date(a.updated_at).getTime());
  });
});


---

## Realtime Tie-in (optional but recommended)
	•	Include version in emitted payloads:

{ type, id, factoryId, action: 'update', changedKeys, version, ts }


	•	In the UI handler, drop events with evt.version < cached.version.

---

## Safety & Scope
	•	This playbook changes schema → requires Architect + CEO/Director approval.
	•	Do not apply to pricing or numbering tables without an ADR labeled Requires Approval.

---

## Stop for Review
	•	Validate no triggers conflict with other BEFORE/AFTER UPDATE logic.
	•	Confirm RLS still guards writes correctly.
	•	Ensure clients map PostgREST 404 (no matching id&version) to 409 Conflict.

