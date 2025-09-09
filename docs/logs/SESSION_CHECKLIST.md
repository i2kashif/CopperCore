# CopperCore ERP - Session Checklist

## Planning Session - Step 2: Manage Company (Org primitives)
**Date:** 2025-09-08  
**Focus:** Implementation planning for factory and user management features

## Context Analysis
- **Step 0:** ✅ Complete - Foundation infrastructure in place
- **Step 1:** ✅ Complete - JWT/Auth system working
- **Current:** Step 2 - Manage Company (Org primitives)

### Current Infrastructure Status
✅ Database tables exist: factories, users, user_factory_links  
✅ RLS policies implemented and working  
✅ Backend server running on port 3001  
✅ Frontend with Tailwind CSS on port 3003  
✅ Auth routes and JWT system functional  
✅ CEO/Director global access implemented  

### Missing for Step 2 Completion
❌ Backend API routes for factory/user management  
❌ Frontend management interfaces  
❌ Event system for realtime updates  
❌ QA acceptance tests (AT-MGMT-001, AT-MGMT-002)  
❌ DoD validation and documentation  

## Now (Next 5)
1. **BACKEND-1** - Create factory management API routes (/src/server/routes/company.ts) - Owner: backend-developer - Refs: §5.12, AT-MGMT-001/002
2. **BACKEND-2** - Create user management API routes (extend company.ts) - Owner: backend-developer - Refs: §5.12, §2.1
3. **BACKEND-3** - Implement event system (factory.created, user.invited events) - Owner: backend-developer - Refs: §3.7
4. **BACKEND-4** - Add API validation and error handling middleware - Owner: backend-developer - Refs: §8, §10  
5. **FRONTEND-1** - Create ManageCompany component with factory/user interfaces - Owner: frontend-developer - Refs: Step 2 checklist

## Later
6. **FRONTEND-2** - Create FactoryForm and FactoryList components - Owner: frontend-developer
7. **FRONTEND-3** - Create UserManagement and UserInviteForm components - Owner: frontend-developer  
8. **FRONTEND-4** - Integrate Manage Company into CEO dashboard navigation - Owner: frontend-developer
9. **FRONTEND-5** - Add realtime event subscriptions to management interfaces - Owner: frontend-developer
10. **QA-1** - Implement AT-MGMT-001: FM cannot create factory/user - Owner: qa-test-engineer
11. **QA-2** - Implement AT-MGMT-002: CEO creates factory; user sees only assigned - Owner: qa-test-engineer
12. **QA-3** - Create integration test suite for company management - Owner: qa-test-engineer
13. **QA-4** - Add E2E tests for factory/user workflows - Owner: qa-test-engineer  
14. **DOCS-1** - Validate DoD evidence collection - Owner: docs-pm
15. **DOCS-2** - Update documentation and traceability matrix - Owner: docs-pm

## Done ✅
- Step 0: Complete infrastructure setup
- Step 1: Login & Auth system
- Database schema with RLS policies
- JWT authentication and factory switching