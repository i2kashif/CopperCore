# CopperCore ERP — CLAUDE.md (AI Development Guide)

> **Purpose:**  
> CopperCore is a factory-scoped ERP for wires/cables/conductors with strict factory RLS, PU-level traceability, DN→GRN logistics, and Pakistan fiscal controls.  
> **PRD-v1.5.md is the single source of truth.** This guide defines how Claude Code works in this repo using mandatory agent roles, approval gates, and test-driven development.

---

## 🚨 CRITICAL: Mandatory Agent Usage

**ALL development MUST use the Task tool with these agents:**
- `planning-coordinator` — **START HERE** - Creates actionable plans and coordinates multi-agent workflows
- `architect-erp` — Database schemas, migrations, RLS policies, security reviews
- `backend-developer` — API endpoints, business logic, service layers
- `frontend-developer` — React components, UI state, realtime subscriptions
- `qa-test-engineer` — Test creation, execution, and validation
- `devops-engineer` — CI/CD, deployments, infrastructure
- `docs-pm` — Documentation, ADRs, release notes, PRD alignment
- `code-linter` — Code quality, formatting, type checking

**Workflow:** Start with `planning-coordinator` to create a plan → Execute with specialized agents → Test with `qa-test-engineer`

---

## 🚫 NO MOCK DATABASES POLICY

**CRITICAL: CopperCore uses REAL databases only. NO mock databases, in-memory databases, or simulated data stores are allowed.**

- **ALL development** must use real Supabase database connections
- **Required environment variables**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **NO USE_MOCK_DB flags** or mock database fallbacks
- **Testing** should use preview databases or test schemas, never mocks
- **Development** must connect to actual database instances

Mock databases create inconsistencies, hide RLS issues, and don't reflect real-world performance. All agents must ensure real database integration.

---

## 1. MCP Services Integration

### 🚀 CRITICAL: MCP Services Must Be Used

**ALL development MUST leverage these MCP services wherever applicable:**

> **📖 Complete Guide:** See [`docs/MCP_SERVICES_GUIDE.md`](docs/MCP_SERVICES_GUIDE.md) for detailed usage instructions, examples, and workflows for all MCP services.

### **Database Operations**
- **Supabase MCP** (`mcp__supabase__*`) — Direct database queries, schema inspection
  - Use for: Schema validation, data exploration, query optimization
  - **MANDATORY** for all database-related tasks before writing manual SQL
  - Project: `iefgojdnjsmsxrzoykol` (read-only mode)

### **Testing & Quality Assurance**
- **TestSprite MCP** (`mcp__TestSprite__*`) — Automated test generation and execution
  - `testsprite_bootstrap_tests` — Initialize testing environment
  - `testsprite_generate_code_summary` — Analyze codebase structure
  - `testsprite_generate_standardized_prd` — Create structured PRDs
  - `testsprite_generate_frontend_test_plan` — Frontend testing strategy
  - `testsprite_generate_backend_test_plan` — Backend testing strategy
  - `testsprite_generate_code_and_execute` — Generate and run tests
  - **MANDATORY** for all new features and bug fixes

### **IDE Integration**
- **VS Code Diagnostics** (`mcp__ide__getDiagnostics`) — Real-time error detection
  - Use before every commit to catch TypeScript/ESLint issues
- **Jupyter Execution** (`mcp__ide__executeCode`) — Python code execution
  - Use for data analysis, migration scripts, validation logic

### **UI/UX Development**
- **MagicUI MCP** (`@magicuidesign/mcp`) — UI component assistance
  - Use for: Component design, styling suggestions, accessibility improvements
  - **MANDATORY** for all frontend component development

### **Memory & Context Management**
- **OpenMemory MCP** (`openmemory`) — Project knowledge management
  - Stores and retrieves project context, decisions, patterns
  - **MANDATORY** for maintaining consistency across sessions

### **Browser Automation**
- **Brave Browser Control** (`ant.dir.gh.tariqalagha.brave-browser-control`) — Web scraping, E2E testing assistance
  - Use for: Competitive analysis, documentation gathering, integration testing
  - **MANDATORY** for browser-based research and validation tasks

### **File System Operations**
- **Filesystem MCP** (`ant.dir.ant.anthropic.filesystem`) — Enhanced file operations
  - Use for: Bulk file operations, pattern matching, directory analysis
  - **MANDATORY** for complex file system operations beyond basic read/write

### **Context Enhancement**
- **Context7** (`context7`) — Advanced context management
  - Use for: Cross-file analysis, dependency tracking, code relationship mapping
  - **MANDATORY** for understanding complex codebases and refactoring tasks

### MCP Usage Workflow

**Before Every Development Task:**
1. **Bootstrap TestSprite** for test environment setup
2. **Query Supabase MCP** for schema understanding
3. **Use MagicUI MCP** for UI/component planning
4. **Check VS Code Diagnostics** for current issues

**During Development:**
1. **Generate tests with TestSprite** before implementation
2. **Use OpenMemory** to store decisions and patterns
3. **Leverage Browser Control** for research and validation
4. **Execute code via Jupyter** for data validation

**Before Committing:**
1. **Run TestSprite execution** for comprehensive testing
2. **Check Diagnostics** for any remaining issues
3. **Update OpenMemory** with completion status

### MCP Integration Rules

✅ **MANDATORY Usage:**
- TestSprite for all testing workflows
- Supabase MCP for database operations
- MagicUI for frontend development
- VS Code Diagnostics before commits
- OpenMemory for session continuity
- Brave Browser Control for research and validation
- Filesystem MCP for complex file operations
- Context7 for codebase analysis and refactoring

⚠️ **When MCP Services Fail:**
- Document the failure in `docs/logs/mcp-issues/`
- Fall back to manual methods ONLY after MCP attempt
- Report issues for future improvement

❌ **Never Skip:**
- TestSprite test generation for new features
- Supabase MCP for schema-related queries  
- MagicUI consultation for UI components
- Diagnostic checks before code commits
- Brave Browser Control for research tasks
- Filesystem MCP for bulk file operations
- Context7 for codebase understanding

---

## 2. Ground Rules

### Authority Hierarchy
1. **PRD-v1.5.md** — Supreme authority for all requirements
2. **CLAUDE.md** — This operational guide
3. **ADRs** — Architecture decisions in `/docs/adr/`
4. **Code** — Implementation details and comments

### Core Principles
- **Factory Scoping:** All data access respects factory boundaries via RLS
- **Least Privilege:** Minimal permissions for all operations
- **Test-First:** Write tests before implementation
- **Approval Gates:** Schema/RLS/pricing changes require human approval
- **No Secrets:** Never commit credentials or API keys

### Terminal Discipline
- Commands producing >200 lines: save to `docs/logs/terminal/<timestamp>.log`
- Use flags: `CI=1 GIT_PAGER=cat FORCE_COLOR=0`
- Never run watchers in Claude's terminal
- Show `git diff --stat` summaries, save patches to `docs/logs/patches/`

---

## 2. Session Management

### Start of Session
1. Read `docs/logs/SESSION_MEMORY.md` for context
2. Read `docs/logs/SESSION_CHECKLIST.md` for tasks
3. Launch appropriate agent with Task tool

### During Work
1. Update task status in checklist (Todo → In Progress → Done)
2. Run tests after each change
3. Capture screenshots for UI changes (if applicable)

### End of Response
1. Update `SESSION_MEMORY.md` with accomplishments
2. Update `SESSION_CHECKLIST.md` with task status
3. Log to `docs/logs/AGENT_EVENT_LOG.md`

### Auto-Summarization
- Summarize `SESSION_MEMORY.md` if >200 lines
- Archive completed tasks if `SESSION_CHECKLIST.md` >200 lines

---

## 3. Autonomy vs Approval

### ✅ Autonomous (No Approval Needed)
- Bug fixes that don't alter schema/RLS
- Test creation and execution
- Documentation updates
- UI component creation (following patterns)
- Linting and formatting
- Dev/preview database operations

### 🛑 Requires Approval
- **Database:** Schema changes, migrations, RLS policies
- **Security:** Authentication, authorization, audit trails
- **Business Logic:** Pricing, numbering series, QC overrides
- **Infrastructure:** Deployments, secrets, production access
- **Compliance:** Pakistan fiscal controls (Sec. 22/23)

**Process:** Create ADR → Tag `Requires Approval` → Wait for human review

---

## 4. Development Workflow

### Step 1: Plan
1. Read relevant PRD sections
2. Identify affected components
3. List required changes
4. Create checklist items

### Step 2: Implement
1. Launch appropriate agent via Task tool
2. Write tests first (TDD)
3. Implement feature
4. Run tests locally

### Step 3: Validate
```bash
# Standard test suite
pnpm -w lint
pnpm -w typecheck
pnpm -w test
pnpm -w e2e

# Database tests
pnpm -w test:db
```

### Step 4: Review
1. Create PR with clear description
2. Reference PRD sections
3. Include test results
4. Document rollback plan

---

## 5. Red Lines (Never Cross)

| Area | Restriction |
|------|------------|
| **Pricing** | No modifications to price lists or invoice logic |
| **Numbering** | No changes to series assignment or formats |
| **RLS** | No weakening of factory boundaries |
| **Audit** | No alterations to append-only audit chains |
| **QC** | No bypassing of quality control gates |
| **Secrets** | Never commit credentials or keys |
| **Production** | Read-only access for all agents |

---

## 6. Agent-Specific Guidelines

### planning-coordinator
- **Primary Role:** Creates actionable development plans
- Analyzes PRD requirements and project state
- Breaks down features into agent-specific tasks
- Coordinates multi-agent workflows
- Produces prioritized task lists

### architect-erp
- Designs schemas with factory scoping
- Creates RLS policies and migrations
- Reviews security architecture
- Requires approval for all changes

### backend-developer
- Implements API endpoints and services
- Handles business logic (non-pricing)
- Manages realtime events
- Enforces optimistic locking

### frontend-developer
- Builds React components with TypeScript
- Implements realtime subscriptions
- Manages UI state and caching
- Handles scanner integrations

### qa-test-engineer
- Creates comprehensive test suites
- Validates RLS boundaries
- Runs E2E Playwright tests
- Ensures PRD compliance

### devops-engineer
- Manages CI/CD pipelines
- Handles deployments and rollbacks
- Configures infrastructure
- Manages secrets securely

### docs-pm
- Maintains PRD alignment
- Creates ADRs for decisions
- Writes release notes
- Updates documentation

### code-linter
- Runs ESLint and Prettier
- Fixes type errors
- Improves code quality
- Creates small cleanup PRs

---

## 7. Project Structure

### Frontend
```
apps/web/src/features/<area>/
  ├── components/     # React components
  ├── hooks/         # Custom hooks
  ├── api.ts         # API calls
  ├── types.ts       # TypeScript types
  └── validators.ts  # Zod schemas
```

### Backend
```
apps/api/src/modules/<entity>/
  ├── routes.ts      # API endpoints
  ├── service.ts     # Business logic
  ├── repo.ts        # Database queries
  ├── schema.ts      # Validation
  └── types.ts       # Type definitions
```

### Shared
```
packages/shared/src/
  ├── types/         # Shared types
  ├── errors/        # Error definitions
  ├── realtime/      # Realtime helpers
  └── utils/         # Common utilities
```

---

## 8. Testing Strategy

### Test Types
1. **Unit Tests** — Individual functions/components
2. **Integration Tests** — API endpoints with database
3. **RLS Tests** — Factory boundary validation
4. **E2E Tests** — Full user workflows (Playwright)

### Coverage Requirements
- Minimum 80% for new code
- 100% for critical paths (auth, payments, audit)
- All PRD acceptance criteria must have tests

---

## 9. CI/CD Pipeline

### PR Checks (Must Pass)
- [ ] Lint (ESLint)
- [ ] Type check (TypeScript)
- [ ] Unit tests
- [ ] Integration tests
- [ ] RLS boundary tests
- [ ] E2E tests (Playwright)

### Protected Paths
Changes to these paths require architect-erp + approval:
- `/infra/migrations/`
- `/infra/policies/`
- `/apps/api/src/db/`
- `/packages/shared/src/security/`

---

## 10. Quick Reference

### Common Commands
```bash
# Development
pnpm dev              # Start dev servers
pnpm -w build        # Build all packages

# Testing
pnpm -w test         # Run all tests
pnpm -w test:db      # Database tests
pnpm -w e2e          # Playwright tests

# Code Quality
pnpm -w lint         # ESLint
pnpm -w typecheck    # TypeScript
pnpm -w lint:fix     # Auto-fix issues
```

### File Size Limits
- **Max file size:** 500 lines
- **Max function:** 80 lines
- **Cyclomatic complexity:** ≤12
- **Migration:** One logical change per file

### Prompt Library
Key prompts in `/docs/prompts/`:
- `rls_policy.md` — Factory RLS implementation
- `optimistic_locking.md` — Version control patterns
- `audit_chain.md` — Tamper-evident logging
- `realtime_cache_invalidation.md` — Cache management
- `testsprite_acceptance_seed.md` — Test generation

---

## 11. PRD Compliance

**Always reference PRD sections in:**
- PR descriptions
- ADR documents
- Test scenarios
- Code comments for complex logic

**Key PRD Sections:**
- §3.6 — Factory scoping & RLS
- §5.3-5.10 — Core workflows
- §8 — Pakistan compliance
- §12 — Acceptance tests

---

## 12. Emergency Procedures

### Production Issue
1. **DO NOT** attempt direct fixes
2. Create incident report in `/docs/incidents/`
3. Use devops-engineer agent for rollback
4. Follow up with root cause analysis

### Failed Deployment
1. Use devops-engineer to check logs
2. Rollback if necessary
3. Fix in dev environment first
4. Re-deploy only after full test suite passes

---

## Remember

✅ **Always use agents via Task tool**  
✅ **MANDATORY: Use MCP services for all applicable tasks**  
✅ **TestSprite for all testing workflows**  
✅ **Supabase MCP for database operations**  
✅ **MagicUI MCP for frontend development**  
✅ **VS Code Diagnostics before commits**  
✅ **OpenMemory for session continuity**  
✅ **Brave Browser Control for research/validation**  
✅ **Filesystem MCP for complex file operations**  
✅ **Context7 for codebase analysis**  
✅ **Test before committing**  
✅ **Reference PRD sections**  
✅ **Update session logs**  
✅ **Request approval for schema/RLS/pricing**  

❌ **Never commit secrets**  
❌ **Never bypass RLS**  
❌ **Never modify pricing logic**  
❌ **Never skip tests**  
❌ **Never work without an agent context**  
❌ **Never skip MCP service usage when applicable**