# ADR-0001: Monorepo Structure

**Status:** Accepted  
**Date:** 2024-09-06  
**Author:** Architect Agent

## Context

CopperCore ERP requires coordinated development across multiple applications (web frontend, API backend) and shared code (types, utilities, business logic). We need to decide on the repository and package management structure.

**Requirements from PRD-v1.5.md:**
- §11: Platform architecture emphasizes code reuse and consistency
- Multiple deployment targets (web app, potential mobile, API services)
- Shared TypeScript types and validation schemas
- Coordinated releases and dependency management

## Decision

We will use a **monorepo structure** with pnpm workspaces:

```
CopperCore/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Fastify backend  
├── packages/
│   └── shared/       # Common types, utils, cache keys
├── infra/            # Database migrations, deployment
└── docs/             # Documentation and ADRs
```

**Package Manager:** pnpm for its superior monorepo support and disk efficiency.

**Build System:** TypeScript project references for incremental builds.

**Shared Dependencies:** Managed at workspace root with per-package overrides.

## Consequences

### Positive
- **Type Safety:** Shared TypeScript types ensure API/frontend consistency
- **Code Reuse:** Business logic and validation shared across apps
- **Coordinated Deployment:** Single source of truth for releases
- **Developer Experience:** Single `git clone` and `pnpm install`
- **Consistent Tooling:** Shared linting, testing, and build configs

### Negative  
- **Complexity:** More complex build and dependency management
- **Build Times:** Larger repository affects CI performance
- **Learning Curve:** Team needs monorepo tooling knowledge
- **Merge Conflicts:** Higher risk of conflicts across teams

## Alternatives Considered

### Multi-Repository (Polyrepo)
**Rejected because:**
- Type drift between frontend and backend
- Complex dependency management for shared code
- Difficult coordinated releases
- PRD emphasizes tight integration

### Nx Monorepo
**Rejected because:**
- Over-engineered for our current scale
- Additional learning curve and tooling complexity  
- pnpm workspaces sufficient for our needs

### Lerna + npm
**Rejected because:**
- pnpm has superior performance and disk usage
- Native workspace support vs Lerna overhead
- Better TypeScript project references integration

## PRD References

- **§11 Platform Architecture:** Supabase-first with TypeScript consistency
- **§10 Security:** Shared validation schemas prevent type mismatches
- **§3.7 Realtime:** Shared cache key patterns across frontend/backend

## Implementation Notes

1. Use TypeScript project references for incremental builds
2. Shared ESLint/Prettier configs in workspace root
3. Per-package build scripts with workspace-level orchestration  
4. GitHub Actions workflows optimized for monorepo builds
5. Selective test execution based on changed files

## Review

This decision should be reviewed when:
- Team size exceeds 10 developers
- Apps become independently deployable services
- Build times exceed acceptable thresholds (>5min CI)