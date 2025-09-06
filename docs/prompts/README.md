# CopperCore Prompt Library

Use these playbooks in **plan mode** with Claude Code. Each file includes:
- **Context & Constraints** grounded in PRD-v1.5.md
- **Preconditions** and **Steps**
- **Deliverables** (files/diffs to produce)
- **Stop for Review** gate (do not commit without approval)

## Index
- [`rls_policy.md`](./rls_policy.md) — Strict RLS for `factory_id` tables (CEO/Director bypass; WITH CHECK)
- [`playwright_grn_discrepancy.md`](./playwright_grn_discrepancy.md) — E2E: DN-first GRN (short receipt) + realtime assertions
- [`optimistic_locking.md`](./optimistic_locking.md) — Add `version` + `updated_at`, 409 conflict pattern, tests
- [`audit_chain.md`](./audit_chain.md) — Tamper-evident audit log with hash chaining
- [`realtime_cache_invalidation.md`](./realtime_cache_invalidation.md) — TanStack keys + Supabase Realtime handlers
- [`testsprite_acceptance_seed.md`](./testsprite_acceptance_seed.md) — Map PRD §12 acceptance tests to runnable specs

**Usage (Claude):**
> “Open `docs/prompts/rls_policy.md`. Execute in **plan mode**. Show diffs and tests. **Do not commit** until I approve.”