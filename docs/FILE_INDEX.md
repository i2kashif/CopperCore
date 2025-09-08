# CopperCore ERP - File Index

> Complete reference of all project files and their purposes

---

## 📋 Core Documentation

| File | Purpose |
|------|---------|
| [`README.md`](../README.md) | Project overview, setup instructions, quick start guide |
| [`CLAUDE.md`](../CLAUDE.md) | AI development guide - workflow, agents, MCP services, red lines |
| [`docs/PRD/PRD_v1.5.md`](PRD/PRD_v1.5.md) | **Single source of truth** - Complete product requirements |
| [`docs/Implementation_Checklist.md`](Implementation_Checklist.md) | 20-step implementation plan with Backend→Frontend→QA→Docs flow |
| [`docs/Traceability_Matrix.md`](Traceability_Matrix.md) | Requirements→Agents→Tests mapping with AT-* IDs |
| [`docs/DB_GUIDE.md`](DB_GUIDE.md) | Database operations, RLS patterns, data flows, troubleshooting |
| [`docs/Stack/Stack.md`](Stack/Stack.md) | Technology stack details - Supabase, React, TypeScript, etc. |

---

## 🗄️ Database Structure

| File/Folder | Purpose |
|-------------|---------|
| [`db/schema/index.ts`](../db/schema/index.ts) | Main schema export - Drizzle ORM type-safe definitions |
| [`db/schema/core.ts`](../db/schema/core.ts) | Core types, enums, base patterns for all modules |
| [`db/migrations/`](../db/migrations/) | Generated SQL migrations from schema changes |
| [`db/migrations/README.md`](../db/migrations/README.md) | Migration process guide and naming conventions |
| [`db/policies/rls-helpers.sql`](../db/policies/rls-helpers.sql) | RLS helper functions - `user_is_global()`, `jwt_factory()`, etc. |
| [`db/seeds/00-factories-and-users.sql`](../db/seeds/00-factories-and-users.sql) | Seed data for factories, users, roles (Step 2-4) |
| [`db/seeds/01-product-families.sql`](../db/seeds/01-product-families.sql) | Seed data for product families and attributes (Step 5) |
| [`db/seeds/02-sample-data.sql`](../db/seeds/02-sample-data.sql) | Sample SKUs, lots, PUs, work orders (Steps 6-9) |

---

## 🧪 Testing Infrastructure

| File/Folder | Purpose |
|-------------|---------|
| [`db/test/jwt-fixtures.ts`](../db/test/jwt-fixtures.ts) | JWT token generation for testing RLS policies with different roles |
| [`db/test/rls-tests.ts`](../db/test/rls-tests.ts) | RLS policy test suite - factory scoping, role-based access |
| [`tests/`](../tests/) | *(Future)* E2E and integration tests with Playwright |

---

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| [`package.json`](../package.json) | NPM scripts, dependencies, project metadata |
| [`tsconfig.json`](../tsconfig.json) | TypeScript configuration with path aliases |
| [`.env`](../.env) | **Secret values** - Supabase credentials, API keys (gitignored) |
| [`.env.example`](../.env.example) | Environment variable template with placeholder values |
| [`.mcp.json`](../.mcp.json) | MCP server configuration using environment variables (portable) |
| [`.mcp.local.json`](../.mcp.local.json) | **OS-specific MCP paths** - brave_control, context7 (gitignored) |
| [`.mcp.local.example.json`](../.mcp.local.example.json) | Template for local MCP configuration |
| [`.gitignore`](../.gitignore) | Git ignore patterns for secrets, build artifacts, etc. |

---

## 🚀 CI/CD & DevOps

| File/Folder | Purpose |
|-------------|---------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | GitHub Actions CI pipeline - tests, builds, deployments |
| [`CODEOWNERS`](../CODEOWNERS) | Code ownership and review requirements |
| [`SECURITY.md`](../SECURITY.md) | Security policies and vulnerability reporting |

---

## 📚 Supporting Documentation

| File/Folder | Purpose |
|-------------|---------|
| [`AGENT.md`](../AGENT.md) | Legacy agent documentation (pre-CLAUDE.md) |
| [`docs/MCP_Service_Guide.md`](MCP_Service_Guide.md) | MCP service setup and troubleshooting |
| [`docs/Session_Information/`](Session_Information/) | Development session logs and agent activity |
| [`docs/adr/`](adr/) | *(Future)* Architecture Decision Records |
| [`docs/logs/mcp-issues/`](logs/mcp-issues/) | *(Future)* MCP service failure logs |

---

## 💾 Database Files

| File | Purpose |
|------|---------|
| [`memory.sqlite`](../memory.sqlite) | OpenMemory MCP storage (gitignored) |

---

## 🔄 Development Workflow

**Documentation Priority Order:**
1. PRD v1.5 → Implementation Checklist → This File Index
2. CLAUDE.md for agent workflow
3. DB_GUIDE.md for database operations  
4. Stack.md for technology decisions

**File Naming Conventions:**
- `UPPER_CASE.md` - Root level important docs
- `kebab-case.md` - Supporting documentation
- `PascalCase.ts` - TypeScript modules
- `snake_case.sql` - Database files