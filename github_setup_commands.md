# GitHub Milestones and Issues Setup Commands

## Prerequisites
First authenticate with GitHub CLI:
```bash
gh auth login
```

## Create Milestones

```bash
# M1 Milestone
gh api repos/i2kashif/CopperCore/milestones -X POST \
  -f title="M1: DB/RLS Foundation (Weeks 1-4)" \
  -f description="Core data platform: Database schema, RLS policies, audit chain, WO operations, realtime infrastructure"

# M2 Milestone  
gh api repos/i2kashif/CopperCore/milestones -X POST \
  -f title="M2: Logistics & Scanning (Weeks 5-8)" \
  -f description="Physical operations: PUs/Labels, packing lists, dispatch notes, GRN discrepancies"

# M3 Milestone
gh api repos/i2kashif/CopperCore/milestones -X POST \
  -f title="M3: Business Logic & QC (Weeks 9-12)" \
  -f description="Commercial operations: On-the-fly SKU, QC framework, customer/pricing, performance"
```

## Create Issues

### M1 Issues

```bash
# M1.1 - Database Schema Foundation
gh issue create \
  --title "Database Schema Foundation (M1.1)" \
  --body "Implement factory-scoped base tables per PRD §2, §3.1, §5.1-5.5. Includes factories, users, product families with configurable attributes, and core entity tables (WO, SKU, lots, PUs) with version fields for optimistic locking. Maps to acceptance test PRD §12.1 (WO Materials Integrity)." \
  --label "epic,M1,schema,Requires Approval" \
  --milestone "M1: DB/RLS Foundation (Weeks 1-4)"

# M1.2 - RLS Policy Implementation  
gh issue create \
  --title "RLS Policy Implementation (M1.2)" \
  --body "Factory scoping RLS per PRD §2.2, §10 with CEO/Director global bypass per PRD §2.1. Use playbook docs/prompts/rls_policy.md. Maps to acceptance test PRD §12.7 (Realtime Scope verification)." \
  --label "epic,M1,security,RLS,Requires Approval" \
  --milestone "M1: DB/RLS Foundation (Weeks 1-4)"

# M1.3 - Audit Chain & Optimistic Locking
gh issue create \
  --title "Audit Chain & Optimistic Locking (M1.3)" \
  --body "Tamper-evident audit per PRD §7 + optimistic locking per PRD §3.7. Use playbooks docs/prompts/audit_chain.md and docs/prompts/optimistic_locking.md. Includes backdating controls for CEO/Director per PRD §2.3." \
  --label "epic,M1,audit,security,Requires Approval" \
  --milestone "M1: DB/RLS Foundation (Weeks 1-4)"

# M1.4 - WO Core Operations
gh issue create \
  --title "WO Core Operations (M1.4)" \
  --body "Work Order creation, acceptance, state machine per PRD §5.3. Material issue/return with lot tracking, production logs with machine requirements. Maps to acceptance test PRD §12.1 (Cannot return > issued per lot)." \
  --label "epic,M1,backend" \
  --milestone "M1: DB/RLS Foundation (Weeks 1-4)"

# M1.5 - Realtime Infrastructure
gh issue create \
  --title "Realtime Infrastructure (M1.5)" \
  --body "Supabase Realtime channels setup per PRD §3.7, §11. Cache invalidation keys, frontend realtime hooks foundation. Maps to acceptance test PRD §12.4 (DN reject → realtime update)." \
  --label "epic,M1,realtime" \
  --milestone "M1: DB/RLS Foundation (Weeks 1-4)"
```

### Additional Issue

```bash
# CI Modularity Guard
gh issue create \
  --title "CI Modularity Guard (ESLint + 500-line check)" \
  --body "Implement ESLint rules and CI checks to enforce CLAUDE.md §13 modularity caps: files <500 lines, functions <80 lines, complexity ≤12." \
  --label "chore,ci,modularity"
```

## Alternative: Create via GitHub Web UI

If CLI doesn't work, you can create these manually at:
- Milestones: https://github.com/i2kashif/CopperCore/milestones
- Issues: https://github.com/i2kashif/CopperCore/issues/new

Make sure to:
1. Create the milestones first
2. Create labels if they don't exist: epic, M1, schema, security, RLS, audit, backend, realtime, chore, ci, modularity, "Requires Approval"
3. Assign issues to their respective milestones