# Branch Protection Rules - CopperCore (Solo Developer)

> **Purpose:** Enforce CI gates and prevent accidental direct commits to main  
> **Authority:** Solo developer, requires manual GitHub UI configuration  
> **PRD Reference:** Sections 7.2 (git flow), 11.5 (CI/CD gates)

## Branch Strategy

- **Main Branch:** `main` (protected, production-ready)
- **Feature Branches:** `feat/<scope>-<summary>` or direct commits for small changes
- **Hotfix Branches:** `fix/<scope>-<summary>` (emergency fixes)

## Protection Rules to Configure

### Main Branch (`main`)

**Require status checks to pass before merging:**
- [x] Require branches to be up to date before merging
- Required status checks:
  - `lint-and-type`
  - `unit-tests` 
  - `database-tests`
  - `e2e-tests`
  - `build`

**Restrict pushes:**
- [x] Restrict pushes to matching branches
- [ ] Include administrators (allow bypass for emergency hotfixes)

**Other restrictions:**
- [x] Allow force pushes: **NO**
- [x] Allow deletions: **NO**
- [ ] Require pull request reviews (disabled for solo dev)
- [ ] Require linear history (optional for solo dev)

## Solo Developer Workflow

1. **Small changes:** Work directly on feature branches, merge via PR for CI validation
2. **Large features:** Create feature branch, use PR to trigger full CI pipeline
3. **Emergency fixes:** Admin bypass available, but CI must still pass post-merge

## CI Gates (Always Required)

All merges to `main` must pass:
- Lint and TypeScript checks
- Unit tests  
- Database and RLS integration tests
- End-to-end Playwright tests
- Build verification

## Manual Configuration Steps

1. Go to GitHub repo Settings > Branches
2. Add rule for `main` branch:
   - Check "Require status checks to pass before merging"
   - Check "Require branches to be up to date before merging" 
   - Select all 5 CI status checks
   - Check "Restrict pushes to matching branches"
   - Leave "Include administrators" **unchecked** (allows emergency bypass)

## Implementation Status

- [ ] Main branch protection configured in GitHub UI
- [ ] CI status checks verified and selected
- [ ] Emergency bypass capability confirmed