# Security Guidelines

## MCP Tool Scopes (Least Privilege)

### Filesystem Access
- **Scope:** Repository root only (`/path/to/CopperCore/`)
- **Prohibited:** `$HOME`, system paths, external repositories

### Database Access
- **Development:** Read/Write to `DATABASE_URL` and `TEST_DB_URL`
- **Staging:** Read/Write via CI only
- **Production:** Read-only access only
- **Prohibited:** Direct production writes, permission bypasses

### GitHub Access
- **Scope:** Repository-specific only
- **Allowed:** PRs, issues, repository metadata
- **Prohibited:** Organization settings, other repositories

### Web Search
- **Scope:** Vendor documentation and public resources
- **Prohibited:** Internal systems, authenticated endpoints

## Red Lines (Never Modify Without Approval)
- Pricing logic and tables
- Numbering/series assignment rules
- RLS policies and security controls
- Audit chain and backdating logic  
- QC override semantics
- Factory scoping mechanisms

## Secrets Management
- Never commit secrets to repository
- Use `.env.example` for templates only
- Store actual secrets in GitHub Actions secrets
- Document minimal required permissions

## Approval Requirements
Changes to these paths require Architect + CEO/Director approval:
- `/infra/migrations/`
- `/infra/policies/`
- `/apps/api/db/`
- `/apps/web/src/security/`
- `/packages/shared/security*`