# ADR-0002: Supabase Platform Choice

**Status:** Accepted  
**Date:** 2024-09-06  
**Author:** Architect Agent

## Context

CopperCore ERP requires a backend platform supporting PostgreSQL with Row Level Security (RLS), real-time subscriptions, authentication, and file storage. The system must enforce strict factory scoping and audit trails per PRD-v1.5.md.

**Critical Requirements:**
- PostgreSQL with advanced RLS support
- Real-time data synchronization across factory locations
- Built-in authentication with custom claims
- File storage for QC certificates and labels
- Backup and point-in-time recovery (PITR)

## Decision

We will use **Supabase** as the primary backend platform:

**Core Services:**
- **Database:** PostgreSQL with RLS and optimistic locking
- **Auth:** Built-in authentication with factory_id claims
- **Realtime:** WebSocket subscriptions for cache invalidation
- **Storage:** File uploads with signed URLs
- **Edge Functions:** Custom business logic (if needed)

**Architecture Pattern:**
- PostgREST for CRUD operations with RLS
- Custom Fastify API for complex business logic
- Client-side queries via Supabase SDK

## Consequences

### Positive
- **RLS Native:** PostgreSQL RLS perfectly matches factory scoping needs
- **Real-time Built-in:** No custom WebSocket infrastructure needed
- **TypeScript First:** Excellent TypeScript SDK and type generation
- **Rapid Development:** Auth, CRUD, and storage included
- **Compliance Ready:** SOC 2, GDPR compliance built-in
- **Cost Effective:** Pay-per-use pricing model
- **Backup/Recovery:** Automated PITR and backups

### Negative
- **Vendor Lock-in:** Migration complexity if Supabase changes
- **PostgREST Limitations:** Complex queries may need custom API
- **Regional Availability:** Limited edge locations vs major clouds
- **Learning Curve:** Team must learn Supabase-specific patterns

## Alternatives Considered

### AWS RDS + Custom API
**Rejected because:**
- Significantly more infrastructure complexity
- Manual auth, realtime, and file storage implementation
- Higher operational overhead
- PRD timeline constraints

### Firebase
**Rejected because:**
- NoSQL doesn't support complex ERP relationships
- No RLS equivalent for factory scoping
- Limited offline capabilities for factory floors
- Real-time pricing model expensive at scale

### Self-hosted PostgreSQL + Hasura
**Rejected because:**
- Complex deployment and maintenance
- No built-in auth and storage
- Team lacks DevOps expertise for production PostgreSQL
- Higher total cost of ownership

### PlanetScale + Custom Stack
**Rejected because:**
- MySQL lacks advanced RLS features needed
- Vitess complexity for our scale
- Multiple service integration complexity

## PRD References

- **§10 Security:** RLS for factory scoping, audit requirements
- **§3.7 Realtime:** Cache invalidation and live updates
- **§11 Platform Architecture:** Supabase as foundation technology
- **§5.10 Testing/QC:** File storage for certificates and test reports
- **§6 Regulatory:** Pakistan compliance and data residency

## Implementation Strategy

### Phase 1: Core Setup
1. Supabase project with staging/production environments
2. Database migrations with RLS policies
3. Auth setup with factory_id claims
4. Basic CRUD via PostgREST

### Phase 2: Advanced Features  
1. Custom Fastify API for business logic
2. Realtime subscriptions with TanStack Query
3. File storage for PDFs and images
4. Edge functions for complex calculations

### Phase 3: Production Hardening
1. Backup and recovery testing
2. Performance monitoring and optimization
3. Regional deployment strategy
4. Disaster recovery procedures

## Risk Mitigation

- **Vendor Lock-in:** Design data layer with abstraction interfaces
- **Performance:** Monitor query performance and add custom indexes
- **Compliance:** Regular security audits and compliance reviews
- **Backup Strategy:** Test restore procedures regularly

## Review Criteria

Re-evaluate this decision if:
- Supabase pricing becomes prohibitive (>$500/month)
- RLS performance doesn't meet factory scale requirements
- Team requires features not available in Supabase
- Regulatory requirements mandate specific hosting regions