# CopperCore ERP - Session Memory

## Step 2 Implementation Planning Session
**Date:** 2025-09-08  
**Session Goal:** Create detailed implementation plan for Step 2: Manage Company (Org primitives)

### Analysis Findings

**Current State:**
- Database foundation is solid with proper RLS policies
- JWT authentication system is working
- Basic CEO/Director dashboards exist
- Backend auth routes functional (/api/auth/*)
- Missing: Company management APIs and UIs

**Key Requirements from Implementation Checklist:**
- Tables: factories, users, user_factory_links ✅ (already exist)
- RLS: CRUD factories/users CEO/Director-only ✅ (policies exist)
- Events: factory.created/updated, user.invited/role_changed ❌ (missing)
- Frontend: CEO dashboard → Manage Company interfaces ❌ (missing)
- QA: AT-MGMT-001, AT-MGMT-002 tests ❌ (missing)

**PRD References:**
- §5.12 Manage Company (Factories, Users, Opening Stock)
- §2.1-2.2 Users, Roles & Factory Scoping

### Planning Strategy

**Agent Workflow:** Backend → Frontend → QA → Docs
1. **backend-developer**: Create company management API routes
2. **frontend-developer**: Build management interfaces 
3. **qa-test-engineer**: Implement acceptance tests
4. **docs-pm**: Update documentation

**Critical Constraints:**
- 500 LOC limit per file
- Must reference PRD sections and AT-IDs
- Dependency-aware task sequencing
- Explicit EXECUTE approval required

### Key Dependencies Identified
1. Backend APIs must be complete before frontend work
2. Event system integration needed for realtime updates
3. Testing requires both API and UI completion
4. DoD evidence collection spans all components