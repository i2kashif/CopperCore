# Architect — Event Log

> Use the template at `../TEMPLATE_EVENT_ENTRY.md`. Keep entries short (≤15 lines) and link PRs/commits.

### 2024-09-06-architect-2  
- **Branch/PR:** feat/supabase-config-pack (pushed, ready for manual PR creation)
- **Scope/files:** Supabase config pack - 11 files across infra/templates, packages/shared/src, apps/api/middleware 
- **Playbooks used:** RLS policy patterns, optimistic locking templates, audit chain design, realtime setup
- **Decisions/risks:**
  - Hash-linked audit chain for tamper evidence vs performance impact
  - Factory-scoped realtime channels vs global filtering
- **Outcome:** Complete D-1 to D-5 implementation with RLS, optimistic locking, audit chain, realtime, storage policies
- **Next actions:** Manual PR creation, testing with actual Supabase instance

### 2024-09-06-architect-1
- **Branch/PR:** scaffold/monorepo (pushed, ready for manual PR creation)
- **Scope/files:** Complete monorepo scaffold - 44 files across root config, apps/web+api, packages/shared, infra/, docs/, tests/
- **Playbooks used:** ADR template for 0001+0002, RLS policy patterns, monorepo best practices
- **Decisions/risks:** 
  - Supabase platform choice with RLS-first security model
  - Large initial commit risk mitigated by structured approach
- **Outcome:** Production-ready scaffold with CI pipeline, migrations, RLS policies, and documentation  
- **Next actions:** Manual PR creation (GH CLI not auth'd), pnpm install after merge, TEST_DB_URL setup

### 2025-09-06-architect-3
- **Branch/PR:** feat/m1-1-database-schema-foundation (commit 3a32c64)
- **Scope/files:** M1.1 Database Schema Foundation - 4 migrations, dev seed, integration tests, ADR-0001
- **Playbooks used:** rls_policy.md, optimistic_locking.md, audit_chain.md
- **Decisions/risks:**
  - Hash-linked audit chain with tamper detection vs storage/performance overhead
  - Many-to-many user-factory assignments vs simple FK for flexibility
  - Trigger-based material return validation for PRD §12.1 acceptance test compliance
- **Outcome:** Complete factory-scoped foundation with RLS, audit chain, configurable product families
- **Next actions:** Requires approval (schema/RLS/audit changes), staging deployment, M1.2 RLS Policy Implementation