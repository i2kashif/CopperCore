# CopperCore ERP — CLAUDE.md (Project Operating Guide)

> **Purpose (3–5 lines)**  
CopperCore is a factory-scoped ERP for wires/cables/conductors with strict factory RLS, PU-level traceability, DN→GRN logistics, Pakistan fiscal controls, and a clean separation of logistics vs pricing.  
**PRD-v1.5.md is the single source of truth.** This guide tells Claude Code Max how to work in this repo: guardrails, autonomy vs approval, workflows, references to agent roles, prompt library, and CI/PR gates.  
Default to **least privilege**, **plan → code → test** loops, and **reviewed PRs**. Never bypass approvals for destructive actions.

---

## 0) Ground Rules (Read Me First)

- **Authority order:** (1) `docs/PRD/PRD_v1.5.md` (supreme), (2) this `CLAUDE.md`, (3) repo docs/ADRs, (4) code comments.  
- **CRITICAL — Agent usage is mandatory:** Use the agent configs in **`/agents/`** for *all* work. Pick the correct role, respect its guardrails and MCP scopes. Never work outside an agent context.  
- **Safety:** Do **not** use `--dangerously-skip-permissions`. Always request permission for file writes, shell commands, or MCP tools.  
- **Separation of concerns:** Do **not** alter **pricing**, **numbering/series**, **RLS/policies**, **audit/backdating**, or **QC override semantics** without explicit approval (see §2.2 and §7).  
- **Factories & RLS:** All work must enforce **factory scoping** via Postgres RLS; CEO/Director are global exceptions per PRD.  
- **Context hygiene:** Prefer reading targeted files or the prompt library index instead of pasting large blobs into chat.

### Terminal & Output Discipline (fix UI flicker)
- Use **Filesystem/GitHub MCP** for edits and reviews; use **Bash** only for short, non-interactive commands.  
- Any command that would print >200 lines **must** stream to a log and show only a short tail:
  - Write to `docs/logs/terminal/<timestamp>.log`, then print the first ~200 lines with a link.  
- Disable pagers/colors in Bash:  
  `CI=1 GIT_PAGER=cat PAGER=cat GH_PAGER=cat FORCE_COLOR=0 <command>`  
- For diffs: show `git diff --stat` / `--name-status`; save full patches to `docs/logs/patches/<timestamp>.patch`.  
- Never run watchers/servers inside Claude’s Bash; output the command for me to run locally and then read/summary the produced log file.

### 🔴 CRITICAL: Session Memory & Checklist Management (MANDATORY)

**At session start (always):**
1. Load the appropriate **agent** (from `/agents/`) for the task.
2. Read `docs/logs/SESSION_MEMORY.md` (recent work).
3. Read `docs/logs/SESSION_CHECKLIST.md` (current tasks).

**Before ending every response (mandatory):**
1. **Visual verification (Puppeteer MCP):** If UI changed, capture at least one screenshot per state (idle/focus/error). If it deviates from the plan or acceptance criteria, iterate and fix first. Attach file paths/links.  
2. **Tests now, not later (TestSprite MCP):** Generate/update tests for each change and run them. Return a short pass/fail summary with artifact links. Keep the suite green (unit/integration/RLS/E2E as applicable).

**After every response (mandatory):**
1. Update **SESSION_CHECKLIST.md** (status, owner, PR links; add new tasks discovered).  
2. Update **SESSION_MEMORY.md** (what changed this session, next steps).  
3. Append a one-liner to `docs/logs/AGENT_EVENT_LOG.md` and a detailed entry in the relevant `docs/logs/agents/*.log.md`.

**Auto-summarization rule (to prevent context bloat):**
- If `SESSION_MEMORY.md` > **200 lines**, summarize older sessions into brief bullets and keep only the latest session in detail.  
- If `SESSION_CHECKLIST.md` > **200 lines**, archive completed items to a summary section and keep only active items in the main list.

---

## 1) Agent Roles & Guardrails (Overview)

For the **complete agent/sub-agent plan** — role scopes, allowed MCP tools, explicit prohibitions, and review/commit gates — **see**:  
👉 **[`/AGENT.md`](./AGENT.md)** (index)  
👉 **[`/CLAUDE/agents/`](./CLAUDE/agents/)** (actual agent configurations - **MUST BE USED**)

> **CRITICAL:** Agent configurations in `/CLAUDE/agents/` are **MANDATORY** for all development tasks.  
> - Roles: Architect, Backend, Frontend, QA, DevOps, Docs/PM.  
> - Each agent in `/CLAUDE/agents/` contains system prompts, guardrails, and MCP permissions.
> - **Prod DB is read-only** for all agents.  
> - Any expansion of MCP permissions requires an ADR + approval.
> - **NEVER proceed with development without loading the appropriate agent context first.**

---

## 2) Autonomy vs Approval

### 2.1 Autonomous (no human approval)
- Inside a **feature PR only**: lint/type fixes, refactors that don’t touch schema/numbering/pricing, test generation & red-green loops, Playwright specs, UI component scaffolds, docs edits.  
- Dev/preview DB writes to validate logic/tests.  
- Non-persisting Puppeteer/Magic tasks; vendor-doc web search.

### 2.2 **Human approval required**
- **Schema & migrations**, **RLS/policies**, **numbering/series**, **pricing areas**, **audit/backdating logic**, **QC override semantics**, **Supabase Storage policies**, **MCP scope expansions**, **deployments**, **secrets/config**.  
- Any change that weakens **factory scoping** or the tamper-evident **audit chain**.  
- Pakistan **regulatory controls** (Sec. 22/23) changes.  
> Use “Requires Approval” label and pair with an ADR (see §3.2).

---

## 3) Day-to-Day Workflows

### 3.1 Anchor to PRD-v1.5.md
1) Open `docs/PRD/PRD-v1.5.md`.  
2) Extract relevant sections (e.g., §5.3 WO, §5.7 GRN, §3.7 Realtime).  
3) List these constraints in the PR description before coding.

### 3.2 Propose an ADR
- Create `docs/adr/NNNN-title.md`: **Context → Decision → Consequences → Alternatives → PRD refs**.  
- Tag the PR **`ADR`** and **`Requires Approval`** if it touches gated areas (schema/RLS/numbering/pricing/audit/QC overrides).

### 3.3 Open a PR (solo-dev, two Macs)
- Branch: `feat/<scope>-<summary>` or `fix/<scope>-<summary>`.  
- PR body: **Problem → Plan → Diffs → Tests → Risk & Rollback → PRD refs**.  
- Run locally before review: **lint → typecheck → unit → integration (DB+RLS) → e2e (Playwright)**.

### 3.4 Requesting secrets / env config
- Add a placeholder to `.env.example`; open PR explaining usage/scope.  
- A human adds real values to **GitHub Actions Secrets** / envs (never commit secrets).  
- Document **least privilege** in `SECURITY.md`.

### 3.5 Test commands (baseline; adjust after scaffold)
- Web: `pnpm -w install && pnpm -w lint && pnpm -w typecheck && pnpm -w test`  
- E2E: `pnpm -w e2e` (Playwright)  
- API: `pnpm -w test:api` or `pytest` (if Django)  
- DB/RLS integration: `pnpm -w test:db` (ephemeral migrations; reset)  
> Attach failing outputs in PRs. QA may generate missing specs via TestSprite; app code fixes still go through PR.

---

## 4) Prompt Library (References, not inline)

To keep this file lean, **all task playbooks / copy-paste prompts** live under `/docs/prompts/`.  
Open the relevant file and execute in **plan mode**; **do not commit** until approvals are met.

- **RLS policy for `factory_id` tables** → `docs/prompts/rls_policy.md`  
- **Playwright: GRN discrepancy (short receipt)** → `docs/prompts/playwright_grn_discrepancy.md`  
- **Optimistic locking (409) migration + tests** → `docs/prompts/optimistic_locking.md`  
- **Tamper-evident audit chain (hash-linked)** → `docs/prompts/audit_chain.md`  
- **Realtime cache invalidation (TanStack + Supabase)** → `docs/prompts/realtime_cache_invalidation.md`  
- **TestSprite: acceptance suite seed (PRD §12)** → `docs/prompts/testsprite_acceptance_seed.md`  
- Index: `docs/prompts/README.md`

**Usage (Claude):**  
> “Open `docs/prompts/rls_policy.md`. Execute the plan; show diffs and tests; **do not commit** until I approve.”

---

## 5) “Red Lines” (Hard Guardrails)

- **Pricing:** Do not modify price lists, invoice posting logic, tax rates/printing.  
- **Numbering/Series:** Do not change assignment/format/reset rules.  
- **RLS/Policies:** Do not weaken/enlarge access without Architect + CEO approval.  
- **Audit/Backdating:** Do not alter append-only audit chain or backdating gates.  
- **QC Overrides:** Do not change HOLD/FAIL override rules; CEO/Director override must be audited.  
- **Factory Scoping:** No cross-factory visibility except global roles.  
- **Secrets:** Never commit secrets or silently expand MCP scopes.  
- **Prod:** No write access for agents; prod DB is **read-only**.

---

## 6) MCP Tools — Overview & Expectations

> Detailed, per-role permissions are defined in **[`/AGENT.md`](./AGENT.md)**. Configure actual servers via `~/.claude/mcp_servers.json` or the Claude Desktop UI.

- `github` — PRs/reviews/issues; repo-scoped only.  
- `filesystem` — **repo root only** (no `$HOME` or system paths).  
- `postgres` (Supabase) — **dev RW**, **staging RW via CI**, **prod RO** (migrations behind approvals).  
- `web-search` — vendor docs/standards preferred.  
- `testsprite` — test plan/gen/run; patch suggestions via PR.  
- `magic-ui` — dev-only component scaffolds; must pass lint/type/storybook.  
- `puppeteer` — headless checks (PDF/labels/UI); ephemeral browser profile.

---

## 7) CI / PR Gates (must be green)

- Lint + typecheck, unit, integration (**DB + RLS**), Playwright E2E.  
- If a PR touches `/infra/migrations`, `/infra/policies`, `/apps/api/db`, `/apps/web/src/security`, `/packages/shared/security*`:  
  - **Architect review + CEO/Director approval** required.  
  - **Staging migration dry-run** + **PITR checkpoint** must be noted in PR.  
- Upload artifacts: test reports, coverage, Playwright traces, DB diff summary.

---

## 8) If PRD vs Best-Practice Conflict

- **Default to PRD-v1.5.md.**  
- If a safety/compliance conflict is detected (e.g., request to bypass RLS), **stop**, open an ADR with a compliant alternative, and mark **`Requires Approval`**.

---

## 9) Quick Start Checklist (for Claude on any task)

1) **Plan** (no writes): read PRD sections + code; outline steps; list files to touch.  
2) **Show diffs** as patches; add/modify tests first (where feasible).  
3) **Request commit**; run tests; iterate fix → retest.  
4) **Open PR** with risks, rollback, and PRD references.  
5) Await required **human approvals** before merging or deploying.

## 10) MANDATORY Agent Usage Workflow

**CRITICAL: This workflow is NOT optional. Failure to use agents is a violation of project standards.**

### Agent Selection & Loading Process:
1. **ALWAYS START** by identifying the task type (frontend, backend, architecture, QA, etc.)
2. **LOAD THE AGENT** from `/CLAUDE/agents/<role>.md` matching your task
3. **ADOPT THE SYSTEM PROMPT** from that agent configuration
4. **FOLLOW THE GUARDRAILS** specified in the agent file
5. **RESPECT MCP PERMISSIONS** defined for that agent

### Why Agents Were Created:
- **Separation of Concerns:** Each agent has specific permissions and cannot exceed their scope
- **Security:** Prevents accidental modifications to critical areas (pricing, RLS, audit)
- **Quality:** Each agent has specialized knowledge for their domain
- **Compliance:** Ensures PRD requirements are met through role-specific constraints

### Common Mistake to Avoid:
**NEVER** work directly without an agent context. The `/CLAUDE/agents/` directory exists specifically to be used, not ignored. These are not optional guidelines—they are mandatory operating procedures.

## 11) Agent Event Logs (memory hygiene)

Claude: **After EVERY prompt response**, you MUST:
1. **Update SESSION_CHECKLIST.md** - Mark completed tasks, add new ones
2. **Update SESSION_MEMORY.md** - Add what was accomplished this response
3. At **session end**, also update:
   - `/docs/logs/AGENT_EVENT_LOG.md` (index)
   - `/docs/logs/agents/<role>.log.md` (your role-specific log)

**Entry template:** use `/docs/logs/TEMPLATE_EVENT_ENTRY.md`. Keep 10–15 lines max; link the PR/commit and the playbooks used.

## 12) Session Checklist / Task Board

Single source of progress truth: `/docs/logs/SESSION_CHECKLIST.md`.

Claude: at session start, **read** it; at session end, **update**:
- Move items across **Todo → In Progress → Done/Blocked**.
- For each "Done", link the PR and the log entry ID.
- If you start new work, create a checklist item first.

## 13) PRD Location

The current Product Requirements Document is here: `docs/PRD/PRD-v1.5.md`.  
Treat this file as the **single source of truth** for domain rules, workflows, roles, Pakistan regulatory controls, Supabase platform choices, realtime/cache policy, RLS, and acceptance tests.

## 14) Code Modularity & Size Limits

**Goal:** keep files small and maintainable.

- **Hard caps:** max **500 lines per file**, max **80 lines per function**, cyclomatic **complexity ≤ 12**.
- **Split rule:** if a file risks exceeding caps, **split** before continuing. Use feature folders and barrel exports.
- **Structure (frontend):** `src/features/<area>/{components/, hooks/, api.ts, types.ts, validators.ts, routes.tsx}`.
- **Structure (backend):** `src/modules/<entity>/{routes.ts, service.ts, repo.ts, schema.ts, types.ts}`.
- **Migrations:** one logical change per file (prefer multiple small migrations over one huge file).
- **Agents:** never introduce files >500 lines without an ADR **and** “Requires Approval”. Propose a split plan instead.