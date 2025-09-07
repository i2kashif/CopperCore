# GitHub Commands to Execute

## Prerequisites
```bash
gh auth login
```

## 1. Create PR for SESSION_CHECKLIST Changes

```bash
gh pr create \
  --title "Mgmt: Focused Session Checklist (feature-first)" \
  --body "## Problem
SESSION_CHECKLIST was dominated by completed housekeeping items, making it hard to focus on current feature development priorities.

## Solution
Refactored checklist structure to emphasize UI-first feature implementation:

### Key Changes
- **Now (Next 5)**: Priority implementation queue with UI-first progression
- **Consolidated Foundation**: Housekeeping A-H condensed to single line with log references  
- **Clear Sections**: Now → In Progress → Todo → Blocked → Done
- **Traceability**: Added PRD section references (§5.3, §12.1, etc.) and acceptance IDs

### UI-First Priority Queue
1. **UI-1**: Authentication System Foundation (Supabase Auth + factory selection + role-based routing)
2. **UI-2**: Manage Company Dashboard (CEO: factories, users, factory assignments)  
3. **UI-3**: User Profile & Factory Context (factory switching, role display, session management)
4. **F-6.1**: Realtime Infrastructure Foundation (entity-scoped channels + cache invalidation)
5. **F-1.1**: WO Material Return Constraints (returns ≤ issued per lot + validation)

### Logical Development Flow
**Auth → Admin UI → User Experience → Infrastructure → Business Logic**

This creates a foundation where each feature builds on the previous, starting with essential authentication and company management before moving to operational workflows.

## Impact
- **Clearer Focus**: Immediate visibility into current feature priorities
- **Better Traceability**: Direct links to PRD requirements and acceptance tests
- **Reduced Cognitive Load**: Completed housekeeping items no longer dominate view
- **Logical Progression**: UI-first approach ensures proper development foundation

## PRD References
- **§2 (Users & Roles)**: Authentication and role-based access foundation
- **§5.12 (Manage Company)**: Company management dashboard requirements
- **§3.7 (Realtime)**: Infrastructure for live updates across all features

Per CLAUDE.md workflow optimization for feature-first development focus." \
  --head mgmt/checklist-focus \
  --base config/mcp-tools
```

## 2. Create GitHub Issues for "Now (Next 5)" Features

### Issue #1: Authentication System Foundation (UI-1)

```bash
gh issue create \
  --title "Authentication System Foundation (Supabase Auth + Factory Selection + Role-Based Routing)" \
  --label "feature,M1,frontend,backend,auth,foundation" \
  --milestone "M1: DB/RLS Foundation" \
  --body "## Overview
Build the complete authentication foundation that enables all subsequent UI development with proper factory scoping and role-based access control.

## Problem  
Current UI has no authentication system. All business features require authenticated users with proper factory assignments and role-based permissions per PRD requirements.

## Solution
Implement comprehensive authentication system with:

### Core Authentication  
- **Supabase Auth Integration**: Email/password login with JWT token management
- **Session Management**: Persistent sessions with automatic token refresh  
- **Factory Context**: Post-login factory selection for multi-factory users
- **Role-Based Routing**: CEO/Director/Factory Manager/Factory Worker route protection

### User Experience Flow
1. **Login Screen**: Clean email/password form with error handling
2. **Factory Selection**: Modal/dropdown for users assigned to multiple factories  
3. **Dashboard Routing**: Role-appropriate landing pages (CEO admin vs FM operations)
4. **Session Persistence**: Remember factory context across browser sessions

## PRD References
- **§2 (Users & Roles)**: CEO (global), Director (global), Factory Manager (scoped), Factory Worker (scoped)  
- **§2.2 (Factory Linkage)**: Users have assigned_factories[]; scoped users filtered by factory
- **§10 (Security)**: Supabase Auth integration, RLS enforcement via JWT claims

## Acceptance Criteria  
✅ User can login with email/password via Supabase Auth  
✅ Multi-factory users see factory selection after login  
✅ Single-factory users auto-assigned to their factory  
✅ CEO/Director can access all factories (global bypass)  
✅ Role-based route protection (FM cannot access CEO admin areas)  
✅ Session persists across browser refresh with factory context  
✅ Logout clears session and redirects to login  

## Technical Implementation
- **Auth Context**: React context provider with Supabase auth state
- **Factory Provider**: Separate context for selected factory and switching
- **Route Guards**: HOCs/hooks for role and factory-based route protection  
- **API Integration**: JWT claims integration with existing RLS policies
- **Form Handling**: React Hook Form with Zod validation

## Files Expected (~1200 lines total)
- \`apps/web/src/features/auth/AuthProvider.tsx\` (~200 lines)
- \`apps/web/src/features/auth/FactoryProvider.tsx\` (~150 lines)  
- \`apps/web/src/features/auth/components/LoginForm.tsx\` (~200 lines)
- \`apps/web/src/features/auth/components/FactorySelector.tsx\` (~150 lines)
- \`apps/web/src/features/auth/hooks/useAuth.ts\` (~100 lines)
- \`apps/web/src/features/auth/hooks/useFactoryContext.ts\` (~80 lines)
- \`apps/web/src/components/RouteGuard.tsx\` (~120 lines)
- \`apps/web/src/routes/index.tsx\` (enhance ~100 lines)
- \`packages/shared/src/types/auth.ts\` (~100 lines)

## Tests Required
- **Unit**: Auth context state management, factory switching logic
- **Integration**: Supabase auth flow, JWT claims with RLS policies  
- **E2E**: Complete login → factory selection → dashboard flow

## Dependencies
- Existing RLS policies (I-1.2 in progress)
- User factory assignments table (completed in I-1.1)
- Supabase configuration (completed in foundation)

## Risks & Mitigations  
- **Risk**: Complex factory context switching logic
- **Mitigation**: Simple provider pattern, clear state separation
- **Risk**: JWT claims integration with RLS  
- **Mitigation**: Test with existing RLS integration tests

**Foundation Priority**: All UI features depend on this authentication system."
```

### Issue #2: Manage Company Dashboard (UI-2)

```bash
gh issue create \
  --title "Manage Company Dashboard (CEO: Factories, Users, Factory Assignments Management)" \
  --label "feature,M1,frontend,backend,admin,company-mgmt" \
  --milestone "M1: DB/RLS Foundation" \
  --body "## Overview
Build the CEO/Director administration dashboard for managing factories, users, and factory assignments - the foundational company management interface.

## Problem
CEOs need to manage the core company structure: create/edit factories, manage users, assign users to factories, and handle opening stock. This is foundational administrative functionality required before operational workflows.

## Solution
Comprehensive company management dashboard with:

### Factory Management
- **Factory CRUD**: Create, edit, disable factories with validation
- **Factory Details**: Name, code, address, contact information, status  
- **Factory Metrics**: User count, active work orders, inventory summary
- **Factory Settings**: Timezone, fiscal year start, operational parameters

### User Management  
- **User CRUD**: Create, edit, disable users with role assignment
- **Role Assignment**: CEO, Director, Factory Manager, Factory Worker selection
- **Multi-Factory Assignment**: Assign users to multiple factories with primary factory
- **User Status**: Active, disabled, pending verification states
- **Bulk Operations**: Import users, bulk role changes, factory assignments

### Assignment Management
- **Visual Assignment Matrix**: Users × Factories grid with assignment status
- **Assignment History**: Audit trail of factory assignment changes  
- **Permission Validation**: Ensure role-appropriate factory access
- **Conflict Resolution**: Handle overlapping assignments and role conflicts

## PRD References
- **§5.12 (Manage Company)**: CEO/Directors can create factories and users; assign users to factories
- **§2.2 (Factory Linkage)**: Each user has assigned_factories[]; FM/FW typically 1 factory
- **§2.1 (Roles)**: CEO (global), Director (global), Factory Manager (scoped), Factory Worker (scoped)

## Acceptance Criteria
✅ CEO can create new factories with complete details and validation  
✅ CEO can create users and assign roles (Director, FM, FW)  
✅ CEO can assign users to multiple factories via intuitive interface  
✅ Factory Manager can be assigned to multiple factories (configurable)  
✅ Factory Worker typically assigned to single factory (validation)  
✅ Assignment changes are audited with timestamp and reason  
✅ Dashboard shows factory summary: users, WOs, inventory status  
✅ Bulk user import via CSV with validation and conflict handling  
✅ All changes respect RLS policies and audit requirements  

## User Experience Design
### Dashboard Layout
- **Header**: Company name, current user, factory context switcher
- **Sidebar Navigation**: Factories, Users, Assignments, Reports sections  
- **Main Content**: Context-sensitive management interfaces
- **Quick Actions**: \"Add Factory\", \"Add User\", \"Bulk Import\" prominent buttons

### Factory Management Screen
- **Factory List**: Cards/table with status, user count, recent activity
- **Factory Form**: Name, code, address, contact, settings in organized sections
- **Factory Detail**: Assigned users, current workload, inventory summary

### User Management Screen  
- **User List**: Filterable table with role, factory assignments, status
- **User Form**: Personal details, role selection, factory assignment checkboxes
- **Assignment Matrix**: Interactive grid showing user-factory relationships

## Technical Implementation
- **State Management**: TanStack Query for server state, Zustand for UI state
- **Form Handling**: React Hook Form with comprehensive validation  
- **Data Tables**: TanStack Table with sorting, filtering, pagination
- **File Upload**: CSV import with progress tracking and error reporting
- **Real-time Updates**: Supabase subscriptions for live assignment changes

## Files Expected (~2000 lines total)
- \`apps/web/src/features/company/components/CompanyDashboard.tsx\` (~300 lines)
- \`apps/web/src/features/company/components/FactoryManagement.tsx\` (~400 lines)
- \`apps/web/src/features/company/components/UserManagement.tsx\` (~450 lines)  
- \`apps/web/src/features/company/components/AssignmentMatrix.tsx\` (~350 lines)
- \`apps/web/src/features/company/components/BulkUserImport.tsx\` (~200 lines)
- \`apps/web/src/features/company/hooks/useCompanyData.ts\` (~150 lines)
- \`apps/web/src/features/company/api/company-api.ts\` (~200 lines)
- \`packages/shared/src/types/company.ts\` (~100 lines)
- \`packages/shared/src/validators/company.ts\` (~100 lines)

## API Endpoints Required (~800 lines backend)
- \`apps/api/src/modules/company/routes.ts\` (~200 lines)
- \`apps/api/src/modules/company/service.ts\` (~300 lines)  
- \`apps/api/src/modules/company/validation.ts\` (~100 lines)
- \`apps/api/src/modules/users/assignment-service.ts\` (~200 lines)

## Tests Required
- **Unit**: Form validation, assignment logic, bulk import processing
- **Integration**: RLS policy enforcement, audit trail creation
- **E2E**: Complete factory creation → user creation → assignment workflow

## Dependencies
- Authentication System (UI-1) - users must be authenticated to access
- Database schema (I-1.1) - factories, users, assignments tables
- RLS policies (I-1.2) - CEO global access, audit enforcement

## Risks & Mitigations
- **Risk**: Complex assignment matrix UI performance with many users/factories  
- **Mitigation**: Virtual scrolling, pagination, search/filter optimization
- **Risk**: Bulk import validation and error handling complexity
- **Mitigation**: Incremental validation, detailed error reporting, rollback support
- **Risk**: RLS policy conflicts with assignment changes
- **Mitigation**: Transaction-based updates, policy validation in service layer

**Strategic Priority**: Essential for company setup and ongoing user management."
```

### Issue #3: User Profile & Factory Context (UI-3)

```bash
gh issue create \
  --title "User Profile & Factory Context (Factory Switching + Role Display + Session Management)" \
  --label "feature,M1,frontend,user-experience,session-management" \
  --milestone "M1: DB/RLS Foundation" \
  --body "## Overview  
Build user profile management and factory context switching interface that provides seamless multi-factory user experience and clear role/permission visibility.

## Problem
Users assigned to multiple factories need intuitive factory switching. All users need clear visibility into their current role, permissions, and factory context to avoid confusion and errors.

## Solution
Comprehensive user profile and context management system:

### Factory Context Management
- **Factory Switcher**: Dropdown/modal with user's assigned factories
- **Current Context Display**: Prominent display of active factory and role  
- **Context Persistence**: Remember last selected factory across sessions
- **Quick Switch**: Keyboard shortcuts and quick-access factory switching

### User Profile Interface
- **Profile Overview**: User details, role, factory assignments, last activity
- **Permission Summary**: Clear display of current permissions and access levels
- **Session Information**: Login time, last activity, session expiration
- **Preferences**: Language, timezone, notification settings, dashboard layout

### Role & Permission Visibility  
- **Role Badge**: Prominent CEO/Director/FM/FW role indicator in header
- **Permission Hints**: Contextual indicators of what actions are available
- **Scope Indicators**: Clear visual distinction between global (CEO/Director) and scoped (FM/FW) access
- **Access Level Warnings**: Friendly notifications when attempting restricted actions

## PRD References
- **§2.2 (Factory Linkage)**: Each user has assigned_factories[]; users filtered by factory
- **§2.1 (Roles)**: Role-based access with clear global vs scoped distinctions  
- **§10 (Security)**: Session management and permission enforcement

## Acceptance Criteria
✅ User can switch between assigned factories via intuitive interface  
✅ Factory context persists across browser sessions and page refreshes  
✅ Current factory and role prominently displayed in application header  
✅ CEO/Director see \"Global Access\" indicator instead of specific factory  
✅ Profile page shows complete factory assignment history and permissions  
✅ Factory switch triggers appropriate data refresh and route updates  
✅ Keyboard shortcuts (Ctrl+Shift+F) open factory switcher  
✅ Session timeout warnings with extend/logout options  
✅ Preference changes persist and affect UI immediately  

## User Experience Design
### Header Context Display
- **Factory Badge**: Current factory name with switching dropdown arrow
- **Role Indicator**: Color-coded role badge (CEO=gold, Director=blue, FM=green, FW=gray)  
- **Global Indicator**: \"Global Access\" for CEO/Director instead of factory name
- **Profile Avatar**: Click opens profile dropdown with logout option

### Factory Switcher Interface  
- **Modal/Dropdown**: List of assigned factories with search capability
- **Factory Cards**: Name, status, user count, last visit for each factory
- **Quick Actions**: \"Set as Primary\", \"View Factory Details\" links
- **Context Switch Confirmation**: Brief loading state during context change

### Profile Management Page
- **Personal Details**: Name, email, phone with edit capability
- **Factory Assignments**: Visual cards showing assigned factories and roles
- **Session Management**: Active sessions, login history, security settings
- **Preferences**: Dashboard layout, notifications, accessibility options

## Technical Implementation  
- **Context Providers**: Enhanced factory context with switching logic
- **State Management**: Persistent factory context in localStorage + Zustand
- **Route Synchronization**: Factory context changes update URL and data queries  
- **Permission Hooks**: Custom hooks for role-based UI conditional rendering
- **Preference Storage**: User preferences in Supabase user metadata

## Files Expected (~1000 lines total)
- \`apps/web/src/features/profile/components/UserProfile.tsx\` (~200 lines)
- \`apps/web/src/features/profile/components/FactorySwitcher.tsx\` (~150 lines)
- \`apps/web/src/features/profile/components/ProfileSettings.tsx\` (~200 lines)  
- \`apps/web/src/components/Header/ContextDisplay.tsx\` (~100 lines)
- \`apps/web/src/components/Header/RoleIndicator.tsx\` (~50 lines)
- \`apps/web/src/hooks/usePermissions.ts\` (~100 lines)
- \`apps/web/src/hooks/useFactorySwitching.ts\` (~150 lines)
- \`packages/shared/src/types/profile.ts\` (~50 lines)

## Tests Required  
- **Unit**: Factory switching logic, permission hook calculations
- **Integration**: Context persistence, role-based UI rendering  
- **E2E**: Complete factory switch → data refresh → permission change workflow

## Dependencies
- Authentication System (UI-1) - requires authenticated user context
- Manage Company (UI-2) - factory assignment management affects switching options
- Database schema (I-1.1) - user factory assignments table

## Risks & Mitigations
- **Risk**: Factory context switching causing data inconsistencies  
- **Mitigation**: Clear loading states, optimistic updates with rollback
- **Risk**: Permission display complexity across different roles
- **Mitigation**: Simple permission mapping, consistent visual indicators  
- **Risk**: Session management complexity with multiple contexts
- **Mitigation**: Separate session and context state, clear separation of concerns

**User Experience Priority**: Critical for multi-factory user productivity and role clarity."
```

### Issue #4: Realtime Infrastructure Foundation (F-6.1)

```bash
gh issue create \
  --title "Realtime Infrastructure Foundation (Entity-Scoped Channels + Cache Invalidation + Supabase Integration)" \
  --label "feature,M1,frontend,backend,realtime,infrastructure" \
  --milestone "M1: DB/RLS Foundation" \
  --body "## Overview
Build the realtime infrastructure foundation that enables all future UI features to receive live updates with fine-grained cache invalidation and factory-scoped channels.

## Problem
Future business workflows require real-time updates (CEO approves while FM is packing, DN rejection updates scanner screens). Without proper realtime foundation, users will work with stale data and miss critical updates.

## Solution
Comprehensive realtime infrastructure using Supabase Realtime with:

### Entity-Scoped Channel System
- **Channel Patterns**: \`factory:<id>\`, \`doc:<type>:<id>\`, \`list:<type>:<factoryId>\`  
- **Payload Structure**: \`{type, id, factoryId, action: 'create|update|delete|approve|reject', changedKeys[], version, ts}\`
- **Factory Scoping**: Users only subscribe to channels for their assigned factories  
- **Cost Control**: Selective subscriptions, auto-unsubscribe on route leave

### Cache Invalidation Strategy
- **TanStack Query Integration**: Targeted query invalidation by entity and scope
- **Optimistic Updates**: Immediate UI updates with server reconciliation
- **Conflict Resolution**: 409 handling with refetch and retry logic  
- **Debounced Updates**: 250-500ms coalescing to minimize update chatter

### Subscription Management
- **Connection Lifecycle**: Auto-reconnect with exponential backoff
- **Subscription Scoping**: Subscribe/unsubscribe based on current factory context
- **Message Ordering**: Sequence numbers to handle out-of-order delivery  
- **Presence Integration**: Optional user presence for collaborative editing warnings

## PRD References  
- **§3.7 (Realtime & Cache Invalidation)**: Fine-grained invalidation, entity-scoped channels, cost control
- **§12.7 (Acceptance Test)**: CEO edits price list → only price list views update; no full app reload

## Acceptance Criteria  
✅ Factory-scoped channels subscribe only to user's assigned factories  
✅ Document changes trigger targeted query invalidation (no full reload)  
✅ List operations (create/delete) revalidate only list heads, not full data  
✅ Updates are debounced (250-500ms) to prevent excessive revalidation  
✅ Connection resilience with auto-reconnect on network issues  
✅ Optimistic updates with conflict resolution (409 → refetch → retry)  
✅ Subscription cleanup on route navigation and factory context changes  
✅ **Test 12.7**: CEO price list edit updates only price views, not entire app  

## Technical Architecture
### Channel Management Layer
- **ChannelManager**: Central subscription coordinator with factory scoping
- **PayloadRouter**: Routes incoming messages to appropriate query invalidation
- **ConnectionMonitor**: Tracks connection health and manages reconnection
- **SubscriptionRegistry**: Tracks active subscriptions per route and factory

### Cache Integration Layer  
- **QueryInvalidator**: Maps realtime events to TanStack Query cache keys
- **OptimisticUpdater**: Handles immediate UI updates with rollback capability
- **ConflictResolver**: 409 error handling with automatic refetch logic  
- **DebauncingQueue**: Coalesces rapid updates to minimize cache churn

### Development/Debug Support
- **Realtime DevTools**: Debug panel showing active subscriptions and message flow
- **Performance Monitoring**: Track subscription count, message volume, invalidation frequency
- **Event Logging**: Structured logging for troubleshooting realtime issues

## Files Expected (~1500 lines total)
- \`apps/web/src/lib/realtime/ChannelManager.ts\` (~300 lines)  
- \`apps/web/src/lib/realtime/SubscriptionRegistry.ts\` (~200 lines)
- \`apps/web/src/lib/realtime/PayloadRouter.ts\` (~250 lines)
- \`apps/web/src/lib/realtime/QueryInvalidator.ts\` (~200 lines)
- \`apps/web/src/lib/realtime/OptimisticUpdater.ts\` (~150 lines)
- \`apps/web/src/hooks/useRealtimeSubscription.ts\` (~200 lines)
- \`packages/shared/src/realtime/channel-keys.ts\` (~100 lines)
- \`packages/shared/src/realtime/payload-types.ts\` (~100 lines)

## Backend Integration (~500 lines)
- \`apps/api/src/modules/realtime/event-publisher.ts\` (~200 lines)  
- \`apps/api/src/modules/realtime/channel-auth.ts\` (~150 lines)
- \`apps/api/src/middleware/realtime-middleware.ts\` (~150 lines)

## Tests Required
- **Unit**: Channel subscription logic, payload routing, cache invalidation mapping
- **Integration**: Supabase realtime connection, factory scoping, permission validation
- **E2E**: Multi-user concurrent scenarios, connection resilience, message ordering
- **Load**: Subscription scaling, message throughput, memory usage under load

## Dependencies  
- Authentication System (UI-1) - factory context required for scoped subscriptions
- Database schema (I-1.1) - RLS policies determine channel access  
- TanStack Query setup - cache layer integration

## Risks & Mitigations
- **Risk**: WebSocket connection management complexity across browser states
- **Mitigation**: Proven connection lifecycle patterns, comprehensive error handling  
- **Risk**: Over-subscription causing performance issues and cost concerns  
- **Mitigation**: Strict subscription scoping, automatic cleanup, monitoring dashboards
- **Risk**: Message ordering and duplicate handling complexity
- **Mitigation**: Sequence numbers, deduplication logic, idempotent operations  
- **Risk**: Cache invalidation logic becoming complex and error-prone
- **Mitigation**: Centralized invalidation mapping, comprehensive test coverage

**Infrastructure Priority**: Foundation for all real-time business workflows and user experience quality."
```

### Issue #5: WO Material Return Constraints (F-1.1)

```bash
gh issue create \
  --title "WO Material Return Validation (Returns ≤ Issued Per Lot + Business Logic Foundation)" \
  --label "feature,M1,backend,work-orders,validation" \
  --milestone "M1: DB/RLS Foundation" \
  --body "## Overview
Implement strict validation ensuring work order material returns never exceed issued quantities per lot, establishing the foundation for reliable inventory tracking and business logic integrity.

## Problem  
Without proper return validation, factories could return more materials than they consumed, creating inventory discrepancies and undermining the integrity of the lot-level traceability system.

## Solution
Comprehensive material return validation system with:

### Core Validation Logic
- **Lot-Level Tracking**: Track issued vs returned quantities per inventory lot  
- **Return Constraints**: \`Returnable Qty = Issued Qty - Previously Returned Qty\`
- **Real-Time Validation**: Prevent returns exceeding available quantity at transaction time
- **Audit Trail**: Complete audit of all material movements with timestamps and reasons

### Business Rules Implementation
- **Multi-Issue Support**: Handle multiple issues from same lot with cumulative tracking
- **Reason Codes**: Capture return reasons (Unused/Excess/Quality) for reporting
- **Factory Scoping**: Enforce returns only within issuing factory (RLS integration)  
- **Transaction Integrity**: Atomic operations with rollback on validation failures

### Error Handling & User Experience
- **Clear Error Messages**: \"Cannot return 150kg from Lot L001. Available: 75kg (200kg issued - 125kg already returned)\"
- **Validation API**: RESTful endpoint returning detailed constraint information
- **Optimistic Locking**: Prevent race conditions in concurrent return operations
- **Recovery Suggestions**: Guide users to correct quantity or split returns

## PRD References
- **§5.3 (Work Orders - Transactions)**: \"Return Materials (FM): bound to previous issues by lot; Returnable = Issued − Returned; cannot exceed\"
- **§12.1 (Acceptance Test)**: \"WO Materials Integrity: Cannot return > issued per lot; attempts return 422 with hint\"

## Acceptance Criteria  
✅ Material return transactions validate against issued quantities per lot  
✅ Attempting to return more than available quantity returns 422 error with detailed message  
✅ Multiple returns from same lot correctly track cumulative returned quantities  
✅ Return transactions are atomic (all validation + database update succeeds or fails together)  
✅ Audit trail captures all material movements with user, timestamp, reason  
✅ Factory scoping enforced - users can only return materials issued within their factory  
✅ Concurrent return attempts handled gracefully with optimistic locking  
✅ **Test 12.1**: Attempting excess return shows clear error with available quantity hint  

## Technical Implementation
### Backend Services (~800 lines)
- **ReturnValidator**: Core validation logic with lot quantity calculations
- **MaterialTransactionService**: Atomic transaction handling for issues/returns  
- **AuditLogger**: Structured audit trail for all material movements
- **QuantityCalculator**: Utility for complex quantity calculations and validations

### Database Layer (~300 lines)  
- **Migration**: Add return quantity constraints and optimistic locking triggers
- **Stored Procedures**: High-performance quantity validation queries  
- **Indexes**: Optimize lookups for lot-based quantity calculations

### API Layer (~400 lines)
- **Return Endpoint**: POST /api/workorders/:id/returns with comprehensive validation
- **Validation Middleware**: Pre-flight validation with detailed error responses
- **Error Formatting**: Structured 422 responses with actionable error messages

### Frontend Integration (~300 lines)  
- **Return Form**: Material return UI with real-time quantity validation
- **Error Display**: User-friendly error messages with quantity breakdown
- **Optimistic Updates**: Immediate UI feedback with server reconciliation

## Files Expected (~1800 lines total)  
- \`apps/api/src/modules/workorders/services/return-validator.ts\` (~300 lines)
- \`apps/api/src/modules/workorders/services/material-transaction.service.ts\` (~250 lines)  
- \`apps/api/src/modules/workorders/routes/returns.ts\` (~200 lines)
- \`apps/api/src/modules/workorders/middleware/return-validation.ts\` (~150 lines)
- \`infra/migrations/024_wo_return_constraints.sql\` (~200 lines) ⚠️ **Requires Approval**
- \`apps/web/src/features/workorders/components/MaterialReturnForm.tsx\` (~300 lines)
- \`apps/web/src/features/workorders/hooks/useReturnValidation.ts\` (~100 lines)
- \`packages/shared/src/types/material-transactions.ts\` (~100 lines)
- \`packages/shared/src/validators/return-validation.ts\` (~100 lines)

## Tests Required (~900 lines)
- \`tests/unit/return-validator.test.ts\` (~200 lines): Core validation logic  
- \`tests/integration/wo-material-returns.test.ts\` (~300 lines): Database + RLS integration
- \`tests/e2e/material-return-workflow.spec.ts\` (~250 lines): Complete user workflow
- \`tests/load/concurrent-returns.test.ts\` (~150 lines): Concurrent return scenarios

## API Design
\`\`\`typescript
POST /api/workorders/:woId/returns
{
  lotId: string,
  quantity: number, 
  reason: 'UNUSED' | 'EXCESS' | 'QUALITY',
  notes?: string
}

// Success Response
200: { 
  success: true, 
  returnId: string,
  newReturnableQuantity: number
}

// Validation Error  
422: {
  error: \"INSUFFICIENT_RETURNABLE_QUANTITY\",
  message: \"Cannot return 150kg from Lot L001. Available: 75kg\",  
  details: {
    lotId: \"L001\",
    requested: 150,
    issued: 200,
    previouslyReturned: 125,
    available: 75
  }
}
\`\`\`

## Dependencies
- Database schema (I-1.1) - material transaction tables
- RLS policies (I-1.2) - factory scoping enforcement  
- Authentication (UI-1) - user context for audit trail

## Risks & Mitigations
- **Risk**: Complex quantity calculation logic with multiple concurrent transactions
- **Mitigation**: Database-level constraints, optimistic locking, comprehensive test coverage
- **Risk**: Performance issues with large transaction history lookups  
- **Mitigation**: Indexed queries, quantity caching, pagination for history views
- **Risk**: Race conditions in concurrent return scenarios
- **Mitigation**: Row-level locking, atomic transactions, conflict resolution

## Playbooks Referenced
- \`docs/prompts/optimistic_locking.md\` - Optimistic locking implementation  
- \`docs/prompts/audit_chain.md\` - Audit trail for material transactions
- \`docs/prompts/rls_policy.md\` - Factory scoping validation

**Business Logic Priority**: Foundation for reliable inventory integrity and operational trust."
```