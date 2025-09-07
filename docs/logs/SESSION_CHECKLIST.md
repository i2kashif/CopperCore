# Session Checklist / Task Board

> Single source of progress truth for CopperCore.  
> Agents: read this at **session start**, update it at **session end**.

## Legend
- 🟦 Todo • 🟨 In Progress • 🟩 Done • 🟥 Blocked

## How agents should use this
1) At session start: skim **Done** and **Blocked**, then set the item you’ll work on to 🟨 and add yourself as **Owner**.  
2) At session end: flip status, add a PR link, and append an event entry to your per-agent log (see `docs/logs/agents/*`).  
3) Keep items short; if scope grows, open a new line item.

---

## Housekeeping (once)
- 🟦 HK-1: PR template at `.github/pull_request_template.md` • **Owner:** DevOps • PR:
- 🟦 HK-2: Ensure `CLAUDE.md` links PRD at `docs/PRD/PRD_v1.5.md` • **Owner:** Docs/PM • PR:
- 🟦 HK-3: Create per-agent logs under `docs/logs/agents/` • **Owner:** Docs/PM • PR:
- 🟦 HK-4: Confirm `CODEOWNERS` has your handle/team • **Owner:** Architect • PR:

---

## C) Monorepo Scaffold
- 🟩 C-1: Root workspace (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) • **Owner:** Architect • PR: scaffold/monorepo
- 🟩 C-2: `apps/web` (Vite + React + TanStack + Tailwind minimal) • **Owner:** Frontend • PR: scaffold/monorepo
- 🟩 C-3: `packages/shared` (zod types + cache keys) • **Owner:** Backend • PR: scaffold/monorepo
- 🟩 C-4: `infra` (migrations `000_base.sql`, `010_tables_min.sql`; `seed/seed.sql`; `scripts/migrate.sh`) • **Owner:** Architect • PR: scaffold/monorepo
- 🟩 C-5: `.github/workflows/ci.yml` (lint/type/unit → db/rls → e2e → build) • **Owner:** DevOps • PR: scaffold/monorepo
- 🟩 C-6: Docs (`ARCHITECTURE.md`, `DECISIONS.md` + 2 ADRs, `SECURITY.md`) • **Owner:** Docs/PM • PR: scaffold/monorepo
- 🟩 C-7: `apps/api` Fastify stub (optional) • **Owner:** Backend • PR: scaffold/monorepo

## D) Supabase / Postgres Config Pack
- 🟩 D-1: RLS policy templates (factory_id, CEO/Director bypass, WITH CHECK) • **Owner:** Architect • PR: feat/supabase-config-pack
- 🟩 D-2: Optimistic locking templates (version/updated_at + 409) • **Owner:** Backend • PR: feat/supabase-config-pack
- 🟩 D-3: Tamper-evident audit chain templates • **Owner:** Architect • PR: feat/supabase-config-pack
- 🟩 D-4: Realtime payload spec + cache key map • **Owner:** Frontend • PR: feat/supabase-config-pack
- 🟩 D-5: Storage bucket policy stubs (PDFs with signed URLs) • **Owner:** Architect • PR: feat/supabase-config-pack

## E) MCP Tools: Config Examples (least-privilege)
- 🟩 E-1: GitHub (read/PR scope) • **Owner:** DevOps • PR: config/mcp-tools
- 🟩 E-2: Filesystem (repo-root only) • **Owner:** DevOps • PR: config/mcp-tools
- 🟩 E-3: Supabase/Postgres (dev RW, prod RO) • **Owner:** Architect • PR: config/mcp-tools
- 🟩 E-4: Web/Search (vendor docs) • **Owner:** Docs/PM • PR: config/mcp-tools
- 🟩 E-5: TestSprite (QA gen/run; PR suggestions only) • **Owner:** QA • PR: config/mcp-tools
- 🟩 E-6: Magic UI + Puppeteer (dev only) • **Owner:** Frontend • PR: config/mcp-tools

## F) CI/CD & Environments
- 🟩 F-1: Branch protection (trunk + short-lived feature branches) • **Owner:** DevOps • PR/Settings: .github/BRANCH_PROTECTION.md
- 🟩 F-2: Matrix pipeline (unit → DB+RLS → e2e → build) • **Owner:** DevOps • PR: Enhanced .github/workflows/ci.yml
- 🟩 F-3: Staging-first migrations; Prod on release tag + PITR note • **Owner:** DevOps • PR: .github/workflows/staging-migrations.yml + release.yml
- 🟩 F-4: Rollback template + backup/PITR checklist • **Owner:** DevOps • PR: .github/ROLLBACK_TEMPLATE.md + BACKUP_PITR_CHECKLIST.md

## G) Test & QA Blueprint (PRD §12)
- 🟩 G-1: Map acceptance tests to specs (Given/When/Then) • **Owner:** QA • PR: tests/acceptance/ACCEPTANCE_TEST_SPECS.md
- 🟩 G-2: RLS assertions per role (CEO/Director/FM/FW) • **Owner:** QA • PR: tests/rls/RLS_ROLE_ASSERTIONS.md
- 🟩 G-3: Backdating tests (CEO/Director only; audited) • **Owner:** QA • PR: tests/backdating/BACKDATING_TESTS.md

## H) Security & Guardrails (Claude-aware)
- 🟩 H-1: Diff guards for `/infra/policies/**` and `number_series*` • **Owner:** DevOps • PR: .github/workflows/security-checks.yml
- 🟩 H-2: Manual approval checklist embedded in PR template • **Owner:** Docs/PM • PR: Enhanced .github/pull_request_template.md

## I) Milestones (90-day)

### M1: DB/RLS Foundation (Weeks 1–4)
- 🟦 I-1.1: Database Schema Foundation (factories, users, product families, core entities) • **Owner:** Architect • PR(s):
- 🟦 I-1.2: RLS Policy Implementation (factory scoping + CEO/Director bypass) • **Owner:** Architect • PR(s):
- 🟦 I-1.3: Audit Chain & Optimistic Locking (tamper-evident + version fields) • **Owner:** Architect • PR(s):
- 🟦 I-1.4: WO Core Operations (create/accept/issue/return/production) • **Owner:** Backend • PR(s):
- 🟦 I-1.5: Realtime Infrastructure (channels + cache invalidation) • **Owner:** Frontend • PR(s):

### M2: Logistics & Scanning (Weeks 5–8)
- 🟦 I-2.1: Packing Units & Labels (PU creation + barcode + reprint flow) • **Owner:** Backend • PR(s):
- 🟦 I-2.2: Packing Lists & Scanner Flows (scanner-first + live tally) • **Owner:** Frontend • PR(s):
- 🟦 I-2.3: Dispatch Note Lifecycle (create/verify/approve + rejection) • **Owner:** Backend • PR(s):
- 🟦 I-2.4: GRN & Discrepancies (DN-first + discrepancy capture) • **Owner:** Backend • PR(s):

### M3: Business Logic & QC (Weeks 9–12)
- 🟦 I-3.1: On-the-Fly SKU System (pending SKU + FM Request & Proceed) • **Owner:** Backend • PR(s):
- 🟦 I-3.2: QC & Testing Framework (QCP + blocking matrix + overrides) • **Owner:** Backend • PR(s):
- 🟦 I-3.3: Customer & Pricing Foundation (cross-refs + invoice generation) • **Owner:** Backend • PR(s):
- 🟦 I-3.4: Performance & Documentation (load testing + docs + deployment) • **Owner:** QA/Docs • PR(s):

---

## Blocked
- 🟥 (add item) • **Reason:** • **Owner:** • **Unblock by:**

## Done (append newest first)
- 🟩 (item code) — PR:  — Log entry: 