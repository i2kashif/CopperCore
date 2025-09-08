# CopperCore ERP — CLAUDE.md (AI Development Guide)

> **Purpose:** CopperCore is a factory-scoped ERP for wires/cables/conductors with strict factory RLS, PU-level traceability, DN→GRN logistics, and Pakistan fiscal controls.  
> **Authority:** [`docs/PRD/PRD_v1.5.md`](docs/PRD/PRD_v1.5.md) is the single source of truth. This file explains how Claude Code contributes to development.

---

## 🚨 Agents

All work MUST run through the Task tool with these agents:
- `planning-coordinator` → **Start here**, create plans, map checklist items
- `architect-erp` → Schemas, migrations, RLS, security reviews
- `backend-developer` → API endpoints, service logic, numbering, idempotency
- `frontend-developer` → React components, state, realtime subscriptions
- `qa-test-engineer` → Tests, coverage, AT-* automation
- `devops-engineer` → CI/CD, ephemeral DBs, deployments
- `docs-pm` → Docs, ADRs, PRD alignment
- `code-linter` → Formatting, type checks

**Workflow:** planning → backend/frontend → qa → docs → merge.

---

## 🗄️ Database Policy

- **No mock DBs for workflows.**  
  - ✅ Allowed: mocks in **pure unit tests** (formatters, SKU grammar).  
  - ❌ Not allowed: mocks for RLS, constraints, sequences, realtime.

- **Test DBs:** ephemeral Postgres/Supabase per PR with seeded roles/factories.

- **Migrations:**  
  - Schema in `/db/schema` (TS + Drizzle)  
  - `pnpm db:generate` → generate migrations  
  - `pnpm db:apply` → apply via runner (no manual psql)  
  - RLS/triggers in `/db/policies/*.sql`, included in batches  
  - Seeds via `pnpm db:seed`
  - Test harness in `/db/test/` with JWT fixtures for RLS validation

- **Docs:** See [`docs/DB_GUIDE.md`](docs/DB_GUIDE.md) for data flow, RLS, troubleshooting.

---

## 🔌 MCP Services

Mandatory services:
- TestSprite MCP → test generation & execution
- MagicUI MCP → frontend assistance
- Puppeteer MCP → browser/E2E validation
- GitHub MCP → repo ops, PRs, issues
- OpenMemory & Context7 → context management
- Brave Control MCP → browser research/automation
- Filesystem MCP & VS Code Diagnostics → local file ops & linting

**Rules:**  
✅ Always use MCP when applicable  
⚠️ Log failures in `docs/logs/mcp-issues/`  
❌ Never skip an MCP step silently

**Configuration:**
- `.mcp.json` — Core services (portable, env-based)
- `.mcp.local.json` — OS-specific paths (gitignored, optional)

---

## 📑 Documentation

**Authority Hierarchy:**
1. **PRD (`docs/PRD/PRD_v1.5.md`)** — Single source of truth
2. **Implementation Checklist (`docs/Implementation_Checklist.md`)** — 20-step plan  
3. **Traceability Matrix (`docs/Traceability_Matrix.md`)** — Requirements→Tests mapping
4. **CLAUDE.md (this guide)** — AI development workflow

**Complete File Reference:** See [`docs/FILE_INDEX.md`](docs/FILE_INDEX.md) for all project files and their purposes.

Every feature implementation must:  
1. Reference the checklist item  
2. Map to AT-* IDs in Traceability Matrix  
3. Follow Backend → Frontend → QA → Docs  
4. Provide DoD evidence

---

## 🔄 Workflow

1. **Plan**  
   - Reference checklist & traceability  
   - Read PRD + AT-* IDs  
   - `planning-coordinator` breaks tasks down

2. **Implement**  
   - Write tests first (AT-* IDs)  
   - Apply migrations, APIs, UI  
   - Run seeded DB tests locally

3. **Review**  
   - Run `code-linter`  
   - Open PR with PRD + AT references  
   - Attach test results + rollback plan

---

## 🚫 Red Lines

| Area | Restriction |
|------|-------------|
| Pricing | Never modify ad hoc |
| RLS | Never weaken factory boundaries |
| Audit | Never bypass append-only logs |
| QC | Never bypass quality control |
| Secrets | Never commit keys/tokens |
| Production | Agents = read-only |

---

## ✅ Testing

- **Unit:** pure helpers (mocks allowed)  
- **Integration:** API + DB (real)  
- **RLS:** role-matrix probes  
- **E2E:** Playwright + Puppeteer  
- **Browser:** UI regression with Puppeteer

**Coverage:**  
- ≥80% new code  
- 100% for critical paths (auth, RLS, DN→GRN, QC, invoices)  
- All PRD acceptance tests (AT-*) automated & passing

---

## 🛑 Emergency

**Production issue**  
1. Do not hotfix directly  
2. File incident in `/docs/incidents/`  
3. `devops-engineer` rollback  
4. RCA + patch via PR

**Failed deployment**  
1. Check logs  
2. Rollback if needed  
3. Fix in dev + retest  
4. Redeploy after green tests

---

## ✔️ Remember

- Always work via agents & MCP  
- Reference Implementation Checklist & Traceability Matrix  
- Never use mock DBs for workflows  
- Tests before code; tie to AT-* IDs  
- Backend → Frontend → QA → Docs order  
- Keep secrets in `.env`, not in repo

---

## 📊 Implementation Status

**Step 0: Initialize Setup (Foundation) - ✅ COMPLETE**
- Repo hygiene (README.md, documentation organization)
- Environment & secrets management (.env, .mcp.json cleanup)
- Database folder structure (/db/schema, /db/migrations, /db/policies, /db/seeds)
- Seed script templates for test data
- RLS harness with JWT fixtures for testing
- CI/CD pipeline (GitHub Actions)
- NPM scripts for database operations

**Next: Step 1 - Login & Auth (JWT/RLS baseline)**