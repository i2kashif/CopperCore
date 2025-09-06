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
- 🟦 C-1: Root workspace (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) • **Owner:** Architect • PR:
- 🟦 C-2: `apps/web` (Vite + React + TanStack + Tailwind minimal) • **Owner:** Frontend • PR:
- 🟦 C-3: `packages/shared` (zod types + cache keys) • **Owner:** Backend • PR:
- 🟦 C-4: `infra` (migrations `000_base.sql`, `010_tables_min.sql`; `seed/seed.sql`; `scripts/migrate.sh`) • **Owner:** Architect • PR:
- 🟦 C-5: `.github/workflows/ci.yml` (lint/type/unit → db/rls → e2e → build) • **Owner:** DevOps • PR:
- 🟦 C-6: Docs (`ARCHITECTURE.md`, `DECISIONS.md` + 2 ADRs, `SECURITY.md`) • **Owner:** Docs/PM • PR:
- 🟦 C-7: `apps/api` Fastify stub (optional) • **Owner:** Backend • PR:

## D) Supabase / Postgres Config Pack
- 🟦 D-1: RLS policy templates (factory_id, CEO/Director bypass, WITH CHECK) • **Owner:** Architect • PR:
- 🟦 D-2: Optimistic locking templates (version/updated_at + 409) • **Owner:** Backend • PR:
- 🟦 D-3: Tamper-evident audit chain templates • **Owner:** Architect • PR:
- 🟦 D-4: Realtime payload spec + cache key map • **Owner:** Frontend • PR:
- 🟦 D-5: Storage bucket policy stubs (PDFs with signed URLs) • **Owner:** Architect • PR:

## E) MCP Tools: Config Examples (least-privilege)
- 🟦 E-1: GitHub (read/PR scope) • **Owner:** DevOps • PR:
- 🟦 E-2: Filesystem (repo-root only) • **Owner:** DevOps • PR:
- 🟦 E-3: Supabase/Postgres (dev RW, prod RO) • **Owner:** Architect • PR:
- 🟦 E-4: Web/Search (vendor docs) • **Owner:** Docs/PM • PR:
- 🟦 E-5: TestSprite (QA gen/run; PR suggestions only) • **Owner:** QA • PR:
- 🟦 E-6: Magic UI + Puppeteer (dev only) • **Owner:** Frontend • PR:

## F) CI/CD & Environments
- 🟦 F-1: Branch protection (trunk + short-lived feature branches) • **Owner:** DevOps • PR/Settings:
- 🟦 F-2: Matrix pipeline (unit → DB+RLS → e2e → build) • **Owner:** DevOps • PR:
- 🟦 F-3: Staging-first migrations; Prod on release tag + PITR note • **Owner:** DevOps • PR:
- 🟦 F-4: Rollback template + backup/PITR checklist • **Owner:** DevOps • PR:

## G) Test & QA Blueprint (PRD §12)
- 🟦 G-1: Map acceptance tests to specs (Given/When/Then) • **Owner:** QA • PR:
- 🟦 G-2: RLS assertions per role (CEO/Director/FM/FW) • **Owner:** QA • PR:
- 🟦 G-3: Backdating tests (CEO/Director only; audited) • **Owner:** QA • PR:

## H) Security & Guardrails (Claude-aware)
- 🟦 H-1: Diff guards for `/infra/policies/**` and `number_series*` • **Owner:** DevOps • PR:
- 🟦 H-2: Manual approval checklist embedded in PR template • **Owner:** Docs/PM • PR:

## I) Milestones (90-day)
- 🟦 I-1: **M1 (Weeks 1–4)** — DB/RLS foundation, WO core, audit chain, realtime wiring, seed data • **Owner:** Architect • PR(s):
- 🟦 I-2: **M2 (Weeks 5–8)** — PUs/PLs + scanner flows, DN lifecycle, in-transit, GRN discrepancies, label reprint • **Owner:** Backend/Frontend • PR(s):
- 🟦 I-3: **M3 (Weeks 9–12)** — Pricing/Invoices blocks & cross-refs, QC QCP + cert PDFs, perf passes, docs • **Owner:** Backend/Frontend/QA • PR(s):

---

## Blocked
- 🟥 (add item) • **Reason:** • **Owner:** • **Unblock by:**

## Done (append newest first)
- 🟩 (item code) — PR:  — Log entry: 