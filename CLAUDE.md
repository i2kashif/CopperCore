# CopperCore ERP — CLAUDE.md (AI Development Guide)

> **Purpose:** CopperCore is a factory-scoped ERP for wires/cables/conductors with strict factory RLS, PU-level traceability, DN→GRN logistics, and Pakistan fiscal controls.  
> **PRD-v1.5.md is the single source of truth.** This guide defines how Claude Code works in this repo.

---

## 🚨 CRITICAL: Mandatory Agent Usage

**ALL development MUST use the Task tool with these agents:**
- `planning-coordinator` — **START HERE** - Creates actionable plans, coordinates workflows
- `architect-erp` — Database schemas, migrations, RLS policies, security reviews  
- `backend-developer` — API endpoints, business logic, service layers
- `frontend-developer` — React components, UI state, realtime subscriptions
- `qa-test-engineer` — Test creation, execution, validation
- `devops-engineer` — CI/CD, deployments, infrastructure
- `docs-pm` — Documentation, ADRs, release notes, PRD alignment
- `code-linter` — Code quality, formatting, type checking

**Workflow:** Start with `planning-coordinator` → Execute with specialized agents → Test with `qa-test-engineer`

---

## 🚫 NO MOCK DATABASES POLICY

**CRITICAL: CopperCore uses REAL databases only. NO mock databases allowed.**
- **ALL development** must use real Supabase database connections
- **Required environment variables**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **NO USE_MOCK_DB flags** or mock database fallbacks
- **Testing** should use preview databases or test schemas, never mocks

---

## MCP Services Integration

**MANDATORY MCP services for ALL development tasks:**

### Core Services
- **Supabase MCP** (`mcp__supabase__*`) — Database operations, schema inspection
- **TestSprite MCP** (`mcp__TestSprite__*`) — Automated test generation and execution
- **MagicUI MCP** (`@magicuidesign/mcp`) — UI component assistance
- **OpenMemory MCP** (`openmemory`) — Project knowledge management
- **Context7** (`context7`) — Advanced context management and codebase analysis

### Development Workflow
- **Filesystem MCP** (`ant.dir.ant.anthropic.filesystem`) — Enhanced file operations
- **VS Code Diagnostics** (`mcp__ide__getDiagnostics`) — Real-time error detection
- **Brave Browser Control** — Research, validation, E2E testing assistance

### MCP Usage Rules
✅ **MANDATORY:** TestSprite for testing, Supabase MCP for database, MagicUI for frontend, OpenMemory for continuity  
⚠️ **When MCP fails:** Document failure in `docs/logs/mcp-issues/`, then manual fallback  
❌ **Never skip:** MCP services when applicable to the task

---

## Ground Rules

### Authority Hierarchy
1. **PRD-v1.5.md** — Supreme authority for all requirements
2. **CLAUDE.md** — This operational guide  
3. **ADRs** — Architecture decisions in `/docs/adr/`
4. **Code** — Implementation details and comments

### Core Principles
- **Factory Scoping:** All data access respects factory boundaries via RLS
- **Test-First:** Write tests before implementation
- **Approval Gates:** Schema/RLS/pricing changes require human approval
- **No Secrets:** Never commit credentials or API keys

### Session Management
**Start:** Read `docs/Session_Information/SESSION_MEMORY.md` for context  
**During:** Update task status, run tests after changes  
**End:** Update memory and checklist, log to `AGENT_EVENT_LOG.md`

---

## Development Workflow

### 1. Plan
- Read relevant PRD sections
- Use `planning-coordinator` agent to create task breakdown
- Identify affected components and required changes

### 2. Implement
- Launch appropriate agent via Task tool
- Write tests first (TDD approach)
- Implement feature with real database integration
- Run tests locally before committing

### 3. Review
- Run code quality checks (`code-linter` agent)
- Create PR with PRD section references
- Include test results and rollback plan

---

## Red Lines (Never Cross)

| Area | Restriction |
|------|------------|
| **Pricing** | No modifications to price lists or invoice logic |
| **RLS** | No weakening of factory boundaries |
| **Audit** | No alterations to append-only audit chains |
| **QC** | No bypassing of quality control gates |
| **Secrets** | Never commit credentials or keys |
| **Production** | Read-only access for all agents |

---

## Testing Strategy

### Test Types
- **Unit Tests** — Individual functions/components
- **Integration Tests** — API endpoints with real database
- **RLS Tests** — Factory boundary validation  
- **E2E Tests** — Full user workflows (Playwright)

### Coverage Requirements
- Minimum 80% for new code
- 100% for critical paths (auth, payments, audit)
- All PRD acceptance criteria must have tests

---

## PRD Compliance

**Always reference PRD sections in:**
- PR descriptions and ADR documents
- Test scenarios and code comments

**Key PRD Sections:**
- §3.6 — Factory scoping & RLS
- §5.3-5.10 — Core workflows
- §8 — Pakistan compliance
- §12 — Acceptance tests

---

## Emergency Procedures

### Production Issue
1. **DO NOT** attempt direct fixes
2. Create incident report in `/docs/incidents/`
3. Use `devops-engineer` agent for rollback
4. Follow up with root cause analysis

### Failed Deployment
1. Use `devops-engineer` to check logs
2. Rollback if necessary
3. Fix in dev environment first
4. Re-deploy only after full test suite passes

---

## Remember

✅ **MANDATORY**
- Always use agents via Task tool
- Use MCP services for all applicable tasks
- TestSprite for all testing workflows
- Supabase MCP for database operations
- Test before committing
- Reference PRD sections
- Update session logs
- Request approval for schema/RLS/pricing changes

❌ **NEVER**
- Commit secrets or bypass RLS
- Modify pricing logic or skip tests
- Work without an agent context
- Skip MCP service usage when applicable
- Use mock databases