Great—thanks for sharing your draft. I tuned it for Supabase (uses auth.jwt()), made the assigned factory array parsing robust, added an optional FORCE ROW LEVEL SECURITY note, and kept everything idempotent.

/docs/prompts/rls_policy.md

# Playbook: RLS Policy for `factory_id` Tables

## Context (PRD-v1.5.md)
- Factory scoping via Postgres **RLS** on **all** tables (PRD §2.2, §10).
- CEO/Director are global exceptions (PRD §2.1).
- Customer portal/reads may have additional policies (PRD §10).

## Preconditions
- Target table(s): `{{TABLE_NAME}}` with `factory_id uuid` (or int) and `created_at`, `updated_at`.
- Roles & claims are provided to Postgres via **Supabase** JWT:
  - `auth.jwt() ->> 'role'` in `('CEO','DIRECTOR','FM','FW')`
  - `auth.jwt() -> 'assigned_factories'` as an array of UUID strings (e.g., `["a3f...","b19..."]`)

## Constraints
- **SELECT**: user sees rows where `factory_id ∈ assigned_factories` **or** user is `CEO|DIRECTOR`.
- **INSERT/UPDATE**: `WITH CHECK` forces `factory_id` to allowed set (or global role).
- **DELETE**: disallow by default (PRD §8 “No silent data loss”). If a table must support delete, create an explicit policy with justification.
- Idempotent migration; tests cover CEO/Director/FM/FW.

## Steps (Plan Mode)
1. **List targets**: Confirm `{{TABLE_NAME}}` exists, has `factory_id`, and an index on `(factory_id)` if the table is large.
2. **Helpers**: Create stable SQL helpers:
   - `cc_is_global()` → bool (CEO/Director) from JWT
   - `cc_assigned_factories()` → `uuid[]` parsed safely from JWT
3. **RLS enable + policies** (SQL templates below).
4. **Tests**: Seed 2 factories, 4 users (CEO, Director, FM@A, FW@A), sample rows for A and B.
5. **Docs**: Add short note on reuse pattern.

## Deliverables
- `infra/migrations/{{timestamp}}_rls_{{table}}.sql`
- `tests/db/rls_{{table}}.test.ts` (or pytest)
- `docs/security/rls_pattern.md` (short)

## SQL Templates (edit placeholders, keep comments)
```sql
-- helpers.sql (once per DB; include or reference from migration)
create or replace function cc_is_global() returns boolean
language sql stable as $$
  select (auth.jwt() ->> 'role') in ('CEO','DIRECTOR')
$$;

create or replace function cc_assigned_factories() returns uuid[]
language sql stable as $$
  select coalesce(
    array(
      select (jsonb_array_elements_text(coalesce(auth.jwt() -> 'assigned_factories', '[]'::jsonb)))::uuid
    ),
    array[]::uuid[]
  )
$$;

-- RLS for {{TABLE_NAME}}
alter table {{TABLE_NAME}} enable row level security;

-- Optional hardening:
-- alter table {{TABLE_NAME}} force row level security;
-- (Use FORCE with care; service_role connections bypass via Supabase, but FORCE applies to table owner too.)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = '{{TABLE_NAME}}' and policyname = 'cc_{{TABLE_NAME}}_select'
  ) then
    create policy cc_{{TABLE_NAME}}_select on {{TABLE_NAME}}
      for select
      using (
        cc_is_global()
        or {{TABLE_NAME}}.factory_id = any (cc_assigned_factories())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = '{{TABLE_NAME}}' and policyname = 'cc_{{TABLE_NAME}}_insert'
  ) then
    create policy cc_{{TABLE_NAME}}_insert on {{TABLE_NAME}}
      for insert
      with check (
        cc_is_global()
        or {{TABLE_NAME}}.factory_id = any (cc_assigned_factories())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = '{{TABLE_NAME}}' and policyname = 'cc_{{TABLE_NAME}}_update'
  ) then
    create policy cc_{{TABLE_NAME}}_update on {{TABLE_NAME}}
      for update
      using (
        cc_is_global()
        or {{TABLE_NAME}}.factory_id = any (cc_assigned_factories())
      )
      with check (
        cc_is_global()
        or {{TABLE_NAME}}.factory_id = any (cc_assigned_factories())
      );
  end if;

  -- Explicitly deny DELETE unless justified by ADR (PRD §8 discourages destructive deletes)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = '{{TABLE_NAME}}' and policyname = 'cc_{{TABLE_NAME}}_delete'
  ) then
    create policy cc_{{TABLE_NAME}}_delete on {{TABLE_NAME}}
      for delete
      using (false);
  end if;
end$$;

-- (Optional) Index for large tables
-- create index if not exists idx_{{TABLE_NAME}}_factory on {{TABLE_NAME}}(factory_id);
```

## Test Skeleton

// tests/db/rls_{{table}}.test.ts
describe('RLS {{TABLE_NAME}}', () => {
  it('CEO sees both factories', async () => { /* seed rows in A & B; jwt role=CEO; expect both */ });
  it('Director sees both factories', async () => { /* role=DIRECTOR */ });
  it('FM@A sees only A', async () => { /* role=FM; assigned_factories=[A] */ });
  it('FW@A cannot insert/update B', async () => { /* role=FW; assigned_factories=[A] */ });
  it('DELETE forbidden by policy', async () => { /* attempt delete; expect forbidden */ });
});
```

## Stop for Review
	•	Do not apply migration until Architect and CEO/Director approve.
	•	Confirm this playbook is not applied to pricing or numbering domains without an ADR marked Requires Approval.

