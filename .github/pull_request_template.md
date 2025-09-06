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

## Approval Required?
<!-- Check if this PR touches gated areas requiring Architect + CEO/Director approval -->
- [ ] Schema/migrations (`/infra/migrations`, `/infra/policies`)
- [ ] Security (`/apps/web/src/security`, `/packages/shared/security*`) 
- [ ] Database access patterns (`/apps/api/db`)
- [ ] Pricing, numbering, audit, or QC override logic

If any boxes above are checked, add **`Requires Approval`** label and wait for approvals per `CLAUDE.md` before merging.