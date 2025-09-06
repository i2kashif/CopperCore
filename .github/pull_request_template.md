## Problem
<!-- What issue does this PR solve? Link any related issues. -->

## Plan 
<!-- High-level approach and key changes -->

## Diffs
<!-- Brief summary of files changed and what each change does -->

## Tests
- [ ] Unit tests added/updated
- [ ] Integration tests (DB + RLS) passing
- [ ] E2E tests covering new flows
- [ ] Manual testing completed

## Modularity (CLAUDE.md §13)
- [ ] No file > 500 lines (or explicit justification + ADR)
- [ ] No function > 80 lines
- [ ] Complexity reasonable (≤12) or refactor plan attached

## Risk & Rollback
<!-- What could go wrong? How to revert if needed? -->

## PRD References
<!-- Link to specific PRD sections (e.g., PRD-v1.5.md §5.3, §3.7) -->

## Checklist
- [ ] No secrets committed
- [ ] Factory scoping preserved  
- [ ] RLS policies not weakened
- [ ] Pricing/numbering/audit domains untouched (or approved)
- [ ] Local tests passing: `pnpm -w lint && pnpm -w typecheck && pnpm -w test`

## Security & Compliance Review

### Critical Path Changes (Auto-detected by CI)
- [ ] **RLS Policies** (`/infra/policies/**`) - Requires Security Architect + CEO approval
- [ ] **Number Series** (`**/*number_series*`, `**/*numbering*`) - Requires CEO approval
- [ ] **Pricing Logic** (`**/*pricing*`, `**/*price_list*`) - Requires Finance + CEO approval
- [ ] **Database Migrations** (`/infra/migrations/**`) - Requires Architect approval + PITR checkpoint
- [ ] **Security Modules** (`**/security/**`, `**/auth/**`) - Requires Security team approval

### RLS Policy Checklist (if RLS changes detected)
- [ ] Factory scoping maintained (no cross-factory data leaks)
- [ ] CEO/Director global access preserved  
- [ ] WITH CHECK constraints prevent unauthorized writes
- [ ] Policy names follow naming convention
- [ ] Comments document business rationale
- [ ] Test coverage updated for policy changes
- [ ] Staging validation completed
- [ ] No `DISABLE RLS` or overly permissive `USING (true)` patterns

### Number Series Checklist (if numbering changes detected)
- [ ] Numbering format maintains global uniqueness
- [ ] No existing series modified (append-only changes only)
- [ ] Reset logic protected (CEO-only access)
- [ ] Cross-references updated (DN, GRN, Invoice templates)
- [ ] Historical data migration plan documented
- [ ] Pakistan regulatory compliance maintained (fiscal numbering)
- [ ] Test coverage includes numbering edge cases
- [ ] No number reuse or duplicate generation risk

### Pricing Logic Checklist (if pricing changes detected)  
- [ ] Price calculation logic verified against business rules
- [ ] Currency and tax handling correct
- [ ] Customer-specific pricing contracts preserved
- [ ] Historical pricing data protected (no destructive changes)
- [ ] Invoice generation compatibility verified
- [ ] Margin calculations updated correctly
- [ ] Integration tests cover pricing edge cases
- [ ] Finance team approval obtained

### Backdating Changes Checklist (if audit/date logic modified)
- [ ] Backdating restricted to CEO/Director roles only
- [ ] Mandatory reason field enforced
- [ ] Complete audit trail captured (user, timestamp, IP, reason)
- [ ] Immutable audit records maintained
- [ ] UI controls properly role-gated
- [ ] API endpoints enforce role restrictions

### Security Module Checklist (if security changes detected)
- [ ] No hardcoded credentials, secrets, or API keys
- [ ] Authentication logic follows established patterns
- [ ] Authorization checks properly implemented  
- [ ] Encryption/hashing uses approved libraries
- [ ] Input validation and sanitization present
- [ ] Error messages don't leak sensitive information
- [ ] Security test coverage updated
- [ ] Vulnerability scan completed

## Approval Workflow

**If any critical path changes detected above:**

1. **Add Labels:** `Requires Approval` + specific labels (`rls-changes`, `pricing-changes`, etc.)
2. **Get Approvals:** 
   - 🛡️ Security Architect (for RLS, auth, security changes)
   - 👑 CEO (for number series, pricing, major security changes)  
   - 💰 Finance (for pricing changes)
   - 🏗️ Architect (for migrations, schema changes)
3. **Complete Checklists:** All applicable checklist items above must be verified
4. **Documentation:** Update relevant ADRs, security docs, or compliance records
5. **Testing:** Enhanced test coverage for critical changes
6. **Staging Validation:** Deploy to staging and verify before production

**⚠️ Do not merge until all required approvals are obtained and checklists completed.**

## Standard Approval Required?
- [ ] Schema/migrations (`/infra/migrations`, `/infra/policies`)
- [ ] Security (`/apps/web/src/security`, `/packages/shared/security*`) 
- [ ] Database access patterns (`/apps/api/db`)
- [ ] Pricing, numbering, audit, or QC override logic
- [ ] Supabase Storage policies or bucket configurations
- [ ] MCP tool scope expansions or new tool integrations