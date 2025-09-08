# CopperCore ERP - Session Checklist

> Tracks progress through Implementation Checklist steps and session tasks

---

## Implementation Checklist Progress

###  Step 0: Initialize Setup (Foundation) - COMPLETE
**Session:** September 8, 2025  
**Status:** All requirements met, foundation ready

#### Checklist Items Completed:
- [x] **Repo hygiene:** README.md, docs organization, FILE_INDEX.md created
- [x] **Env/Secrets:** All keys moved from .mcp.json to .env; .env.example created
- [x] **MCP:** ${WORKSPACE_ROOT} used; OS-specific paths removed; headless Puppeteer configured
- [x] **DB:** Database folder structure created (/db/schema, /db/migrations, /db/policies, /db/seeds)
- [x] **Seeds:** Script templates for 2 factories, users (CEO, Director, FM, FW, Office), sample families/SKUs/lots/PUs
- [x] **RLS harness:** JWT fixtures for each role with role, factory_id, user_id claims
- [x] **CI:** GitHub Actions with ephemeral DB, migration runner, test framework, artifact upload
- [x] **DoD:** Infrastructure ready for `pnpm db:migrate && pnpm db:seed`

### = Step 1: Login & Auth (JWT/RLS baseline) - NEXT
**Target:** Next session  
**Prerequisites:**  Step 0 complete

#### Planned Tasks:
- [ ] Configure Supabase Auth to mint JWTs with role & factory_id
- [ ] Add SQL helpers: jwt_factory(), user_is_global(), jwt_role()
- [ ] RLS probe SQL for SELECT/INSERT/UPDATE/DELETE by role
- [ ] Login page with post-login role/factory routing
- [ ] Session store + token refresh; role badges
- [ ] AT-SEC-001: cross-factory read denied for non-global
- [ ] AT-SEC-002: CEO/Director global read allowed

---

## Session Task Tracking

### Session: September 8, 2025 - Foundation Setup
**Status:**  COMPLETE

#### Tasks Completed:
- [x] Create README.md with project overview and setup instructions
- [x] Move and organize documentation files correctly (Db_Guide.md � docs/DB_GUIDE.md)
- [x] Update .mcp.json to use environment variables instead of hardcoded secrets
- [x] Create database folder structure (/db/schema, /db/migrations, /db/policies, /db/seeds)
- [x] Create seed scripts for factories, users, and sample data
- [x] Create RLS harness with JWT fixtures
- [x] Setup CI/CD pipeline with GitHub Actions
- [x] Add NPM scripts for database operations
- [x] Fix broken documentation paths and casing inconsistencies
- [x] Remove OS-specific paths from .mcp.json configuration
- [x] Update all cross-references to use correct file names

#### Verification Results:
-  `pnpm install` - All dependencies installed successfully
-  `pnpm test:rls` - RLS test harness runs without errors
-  Environment setup - All MCP services configured with real values
-  Documentation - All file references consistent and working

---

## Next Session Preparation

### Ready to Begin:
- **Step 1: Login & Auth** from Implementation Checklist
- Agent workflow established (use `planning-coordinator` to start)
- Database infrastructure ready for schema implementation
- Testing framework ready for RLS validation

### Session Goals for Next Time:
1. Use `planning-coordinator` agent to plan Step 1 implementation
2. Implement JWT/RLS baseline with Supabase Auth
3. Create basic login flow and role-based routing
4. Implement and test factory scoping policies
5. Complete acceptance tests AT-SEC-001 and AT-SEC-002

### Context Status:
- **Current Usage:** 142k/200k tokens (71%)
- **Free Space:** 57.9k tokens available for Step 1
- **MCP Services:** All operational and ready