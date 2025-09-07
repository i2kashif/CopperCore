# ADR-0001: M1.1 Database Schema Foundation Design

**Status:** Proposed  
**Date:** 2025-09-06  
**Deciders:** Architect, CEO/Director (approval required)  

## Context

CopperCore ERP requires a factory-scoped database foundation that supports:
- Row Level Security (RLS) with CEO/Director global bypass per PRD §2.1, §2.2
- Tamper-evident audit chain per PRD §7
- Optimistic locking for concurrent updates per PRD §3.7
- Configurable product families with attributes per PRD §3.1
- Work Order material tracking with integrity constraints per PRD §5.3, §12.1

This is M1.1 of the implementation roadmap, establishing the core data platform.

## Decision

Implement enhanced database schema with the following key components:

### 1. Factory Scoping & RLS
- **User-Factory Assignments:** Many-to-many table supporting users assigned to multiple factories
- **Enhanced RLS Functions:** `cc_is_global()` and `cc_assigned_factories()` following playbook patterns
- **Consistent Policy Pattern:** All tables use same RLS policy structure for maintainability

### 2. Tamper-Evident Audit Chain  
- **Hash-Linked Audit Log:** Each record links to previous via SHA-256 hash of canonical JSON
- **Comprehensive Coverage:** All business tables audited except operational metadata
- **Integrity Verification:** Built-in functions to detect tampering attempts

### 3. Configurable Product Families
- **Attribute Configuration:** Flexible attribute system supporting number/text/enum types
- **Level-Based Attributes:** SKU-level (decided at WO) vs lot-level (decided at production)
- **Dynamic SKU Generation:** Code generation based on family naming rules and attributes

### 4. Work Order Material Integrity
- **Issue/Return Tracking:** Separate tables for material issues and returns with validation
- **Constraint Enforcement:** Trigger-based validation preventing returns > issued per lot
- **Production Logging:** Machine-required production logs with scrap/rework tracking

### 5. Document Numbering
- **Factory-Scoped Series:** Each factory maintains separate numbering sequences
- **Fiscal Year Reset:** Annual reset following PRD fiscal year (Jul 1 - Jun 30)
- **Atomic Generation:** Thread-safe sequence number generation

## Consequences

### Positive
- **Strong Data Integrity:** RLS + audit chain + optimistic locking provides comprehensive protection
- **PRD Compliance:** Direct implementation of PRD §12.1 acceptance test and other requirements  
- **Scalable Architecture:** Factory scoping enables multi-tenant operations
- **Audit Trail:** Complete tamper-evident history for compliance and debugging
- **Flexible Product Model:** Configurable attributes support diverse product families

### Negative  
- **Complexity:** Multiple interconnected systems require careful coordination
- **Performance Impact:** RLS and audit triggers add overhead to all operations
- **Storage Overhead:** Comprehensive auditing increases storage requirements
- **Migration Complexity:** Extensive schema changes require careful rollout

### Risks
- **RLS Policy Gaps:** Incorrectly configured policies could leak data across factories
- **Audit Chain Breaks:** Schema changes must preserve audit chain integrity
- **Performance Bottlenecks:** Heavy audit logging may impact high-throughput operations
- **Data Migration:** Existing data needs careful migration to new schema

## Alternatives Considered

### 1. Application-Level Security (Rejected)
- **Considered:** Handle factory scoping in application layer
- **Rejected:** Less secure, more complex, harder to audit

### 2. Simple Audit Trail (Rejected)  
- **Considered:** Basic audit logging without hash chaining
- **Rejected:** PRD §7 specifically requires tamper-evident audit

### 3. Monolithic Product Schema (Rejected)
- **Considered:** Fixed product schema with predefined attributes
- **Rejected:** PRD §3.1 requires configurable attributes per family

## PRD References

- **§2.1, §2.2:** User roles and factory scoping
- **§3.1:** Product families with configurable attributes  
- **§3.7:** Optimistic locking for concurrent updates
- **§4:** Document numbering and fiscal year handling
- **§5.3:** Work Order operations and material tracking
- **§7:** Tamper-evident audit chain requirements
- **§10:** Security and RLS requirements
- **§12.1:** WO Materials Integrity acceptance test

## Implementation Notes

- All migrations are idempotent and respect CLAUDE.md §13 modularity caps (< 500 lines)
- Schema changes require CEO/Director approval per CLAUDE.md §2.2 red lines
- Test coverage includes RLS verification and PRD acceptance criteria
- Comprehensive seed data supports development and testing

## Approval Required

This ADR requires approval because it:
- Modifies schema and RLS policies (CLAUDE.md §2.2 red lines)
- Implements audit/backdating logic requiring approval
- Establishes foundation for pricing and numbering systems

**Next Steps:**
1. Review migration files and test coverage
2. Validate RLS policies don't weaken factory scoping
3. Confirm audit chain implementation meets PRD §7 requirements
4. Approve before deployment to staging environment