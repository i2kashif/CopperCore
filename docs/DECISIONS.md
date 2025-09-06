# Architectural Decision Records (ADR) Index

This document tracks all architectural decisions made for CopperCore ERP.

## ADR Format

Each ADR follows this template:
- **Context:** The situation and problem  
- **Decision:** What we decided to do
- **Consequences:** Positive and negative outcomes
- **Alternatives:** Options we considered but rejected
- **PRD References:** Links to relevant PRD sections

## Decision Log

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./adr/0001-monorepo-structure.md) | Monorepo Structure | ✅ Accepted | 2024-09-06 |
| [0002](./adr/0002-supabase-platform.md) | Supabase Platform Choice | ✅ Accepted | 2024-09-06 |

## Decision Categories

### Platform Decisions
- ADR-0002: Supabase as primary platform

### Code Organization  
- ADR-0001: Monorepo with pnpm workspaces

### Security & Compliance
- TBD: RLS policy patterns
- TBD: Pakistan fiscal compliance approach

### Performance & Scale
- TBD: Caching strategy
- TBD: Database partitioning

### Development Process
- TBD: Testing strategy
- TBD: CI/CD pipeline

## Upcoming Decisions

Major decisions that need ADRs:
1. **Authentication Provider:** Supabase Auth vs external
2. **API Pattern:** PostgREST vs custom Fastify routes  
3. **File Storage:** Supabase Storage vs external CDN
4. **Reporting Engine:** Built-in vs external BI tool
5. **Mobile Strategy:** PWA vs native apps

## Decision Criteria

All architectural decisions should consider:
- **Security:** RLS compliance and audit requirements
- **Performance:** Factory scale and response times
- **Maintainability:** Team skills and long-term support
- **Compliance:** Pakistan regulatory requirements
- **Cost:** Infrastructure and licensing expenses