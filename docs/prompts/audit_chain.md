/docs/prompts/audit_chain.md

# Playbook: Tamper-Evident Audit Chain

> **Goal**  
Implement an **append-only**, **hash-linked** audit log so any change to historical records is **detectable**. Each audit row stores `previous_hash → current_hash` over a **canonicalized** JSON representation of the new state (or tombstone on delete). This is **tamper-evident** (not tamper-proof). Optional daily checkpoints strengthen guarantees.

---

## Context (PRD-v1.5.md §7, §10)
- Append-only activity per entity: `{actorId, action, before, after, ts, ip, ua}`; **no destructive deletes** after activity.  
- **Tamper-evident** requirement via hash chaining.  
- Retention: electronic records ≥ **6 years**.

---

## Preconditions
- Postgres **pgcrypto** enabled for `digest()` (sha256).  
- Decide target tables for auditing (exclude **pricing** and **numbering** tables unless an ADR marked **Requires Approval** is approved).  
- Supabase: `auth.uid()` available; `auth.jwt()` for role claims.  
- (Optional) API sets headers → Postgres GUCs for IP/UA:
  - `set_config('cc.ip', <ip>, true)`, `set_config('cc.ua', <ua>, true)`; fall back to `inet_client_addr()` if unset.

---

## Steps (Plan Mode)
1) **Schema**: `audit_log` table to store chain, metadata, and helpful indexes.  
2) **Canonicalization**: deterministic function for JSON (`object keys sorted recursively`) → canonical **text**; arrays preserved order.  
3) **Hasher**: `current_hash = sha256( previous_hash || canonical(after_json) )`.  
4) **Triggers**: On `INSERT/UPDATE/DELETE` of target tables, write one audit row (DELETE writes tombstone `{ _deleted: true }`).  
5) **Verification**: query/function to walk the chain for `(target, target_id)` and detect breaks.  
6) **(Optional) Checkpoints**: daily anchor of each chain head to a separate table for quick detection windows.

---

## Deliverables
- `infra/migrations/{{ts}}_audit_chain.sql` (schema, functions, example attachments)  
- `infra/functions/audit_chain.sql` (if separated)  
- `tests/db/audit_chain.test.ts` (detects tampering and verifies continuity)

---

## SQL Template (safe & idempotent)
```sql
-- 1) Required extension
create extension if not exists pgcrypto;

-- 2) Audit table (append-only)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  target text not null,          -- e.g., TG_TABLE_NAME
  target_id text not null,       -- cast of the entity's primary key
  action text not null,          -- 'insert'|'update'|'delete'
  before jsonb,
  after jsonb not null,          -- tombstone on delete
  actor uuid,                    -- auth.uid() where available
  ip text,
  ua text,
  ts timestamptz not null default now(),
  previous_hash bytea,
  current_hash bytea not null
);

-- Helpful indexes
create index if not exists idx_audit_target_id_ts on audit_log(target, target_id, ts);
create index if not exists idx_audit_current_hash on audit_log(current_hash);

-- 3) Canonicalization (deterministic, recursive; sorts object keys)
--    Returns JSONB with keys sorted; arrays preserved order.
create or replace function cc_jsonb_canon(j jsonb) returns jsonb
language sql immutable as $$
  select case jsonb_typeof(j)
    when 'object' then (
      select jsonb_object_agg(key, cc_jsonb_canon(value))
      from (
        select key, value from jsonb_each(j) order by key
      ) s
    )
    when 'array' then (
      select jsonb_agg(cc_jsonb_canon(value))
      from jsonb_array_elements(j)
    )
    else j
  end
$$;

-- Canonical text for hashing
create or replace function cc_jsonb_canon_text(j jsonb) returns text
language sql immutable as $$
  select cc_jsonb_canon(j)::text
$$;

-- 4) Hash composer: sha256(previous_hash || canonical(after))
create or replace function cc_audit_next_hash(prev bytea, after jsonb) returns bytea
language sql immutable as $$
  select digest(
    coalesce(prev, '\x'::bytea) || convert_to(cc_jsonb_canon_text(after), 'utf8'),
    'sha256'
  )
$$;

-- 5) Main trigger to append audit rows
create or replace function cc_audit_trigger() returns trigger
language plpgsql as $$
declare
  prev bytea;
  k text;
  v text;
  _actor uuid;
  _ip text;
  _ua text;
  _target_id text;
  _after jsonb;
begin
  -- Resolve actor/ip/ua
  begin
    _actor := nullif(auth.uid()::text, '')::uuid;  -- Supabase; null if not available
  exception when others then
    _actor := null;
  end;

  _ip := coalesce(current_setting('cc.ip', true), inet_client_addr()::text);
  _ua := current_setting('cc.ua', true);

  -- Define target id (string cast of PK; adapt if your PK isn't "id")
  _target_id := coalesce(new.id::text, old.id::text);

  -- Define "after" image (tombstone on DELETE)
  _after := coalesce(to_jsonb(new), jsonb_build_object('_deleted', true));

  -- Get previous hash in chain
  select current_hash into prev
  from audit_log
  where target = TG_TABLE_NAME and target_id = _target_id
  order by ts desc, id desc
  limit 1;

  insert into audit_log(target, target_id, action, before, after, actor, ip, ua, previous_hash, current_hash)
  values (
    TG_TABLE_NAME,
    _target_id,
    TG_OP::text,
    to_jsonb(old),
    _after,
    _actor,
    _ip,
    _ua,
    prev,
    cc_audit_next_hash(prev, _after)
  );

  return coalesce(new, old);
end;
$$;

-- 6) Helper to attach trigger to a table
-- Example usage (run per audited table):
--   select cc_attach_audit('public', '{{TABLE}}');
create or replace function cc_attach_audit(sch text, tbl text) returns void
language plpgsql as $$
declare
  trg_name text := format('cc_audit_%s', tbl);
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = trg_name and n.nspname = sch and c.relname = tbl
  ) then
    execute format(
      'create trigger %I after insert or update or delete on %I.%I
         for each row execute function cc_audit_trigger()',
      trg_name, sch, tbl
    );
  end if;
end;
$$;

-- Example to attach (repeat for each target table)
-- select cc_attach_audit('public', '{{TABLE}}');

-- 7) Verification: detect broken chains for a specific entity
create or replace function cc_audit_verify_entity(p_target text, p_target_id text)
returns table(idx int, ok boolean, expected_prev bytea, actual_prev bytea, row_id uuid) language sql stable as $$
  with seq as (
    select row_number() over (order by ts, id) as rn, *
    from audit_log
    where target = p_target and target_id = p_target_id
    order by ts, id
  ),
  chk as (
    select
      rn as idx,
      lag(current_hash) over (order by rn) as expected_prev,
      previous_hash as actual_prev,
      (lag(current_hash) over (order by rn) is not distinct from previous_hash) as ok,
      id as row_id
    from seq
  )
  select idx, ok, expected_prev, actual_prev, row_id from chk;
$$;

-- 8) (Optional) Daily checkpoints to speed detection windows
create table if not exists audit_checkpoint (
  day date primary key,
  snapshot_ts timestamptz not null default now(),
  head_hash bytea not null,     -- digest over concatenation of all chain heads
  meta jsonb
);

create or replace function cc_audit_make_checkpoint() returns void
language sql as $$
  with heads as (
    select target, target_id,
           (select current_hash
              from audit_log a2
             where a2.target = a1.target and a2.target_id = a1.target_id
             order by ts desc, id desc
             limit 1) as head
    from (select distinct target, target_id from audit_log) a1
  ),
  concat as (
    select string_agg(encode(head, 'hex') || ':' || target || ':' || target_id, ',' order by target, target_id) as s
    from heads
  )
  insert into audit_checkpoint(day, head_hash, meta)
  select current_date,
         digest(convert_to(coalesce(s, ''), 'utf8'), 'sha256'),
         jsonb_build_object('count', (select count(*) from heads))
  from concat
  on conflict (day) do nothing;
$$;


---

## Test Skeleton (tests/db/audit_chain.test.ts)

import { db } from '../helpers/db';

describe('Audit chain', () => {
  let id: string;

  beforeAll(async () => {
    // Attach trigger to a small test table and insert a row
    await db.query(`select cc_attach_audit('public', '{{TABLE}}')`);
    const r = await db.insert('{{TABLE}}', { name: 'x' }); // returns id
    id = r.id;
  });

  it('links previous → current hashes deterministically', async () => {
    await db.update('{{TABLE}}', { id, name: 'y' });
    const rows = await db.query(
      `select * from cc_audit_verify_entity($1, $2) where not ok`,
      ['{{TABLE}}', id]
    );
    expect(rows.rowCount).toBe(0);
  });

  it('detects tampering (simulated)', async () => {
    // Forcefully modify an audit row (simulate bad actor)
    await db.query(
      `update audit_log set after = jsonb_set(after, '{name}', '"evil"') where target = $1 and target_id = $2 limit 1`,
      ['{{TABLE}}', id]
    );
    const broken = await db.query(
      `select * from cc_audit_verify_entity($1, $2) where not ok`,
      ['{{TABLE}}', id]
    );
    expect(broken.rowCount).toBeGreaterThan(0);
  });
});


---

## Operational Notes
	•	Keep audit_log RLS-disabled (default) so triggers can write regardless of caller RLS. Restrict direct table access to service roles only.
	•	Performance: for high-write tables, consider partitioning audit_log by month or using a partial index by target.
	•	PII: only record fields required for traceability; avoid sensitive data in before/after when unnecessary.
	•	Backfills: when introducing audit later, seed an initial row (action='bootstrap') if you need a chain start marker.

---

## Stop for Review
	•	Architect + CEO/Director approval required before enabling on new tables.
	•	Confirm exclusions for pricing and numbering domains (unless ADR approved).
	•	Verify that application code sets cc.ip and cc.ua where possible to improve provenance.

