# CopperCore ERP - Session Checklist

## Step 1: Login & Auth (JWT/RLS baseline) ✅ COMPLETE

### Backend ✅ COMPLETE
- [x] citext extension enabled
- [x] user_role enum created
- [x] factories table with code/name/active
- [x] users table with citext username
- [x] user_factory_links for multi-factory assignments
- [x] user_settings with selected_factory_id
- [x] Auth sync triggers between auth.users and public.users
- [x] SQL helper functions: current_factory(), user_is_global(), jwt_role(), jwt_user_id()
- [x] Comprehensive RLS policies with WITH CHECK clauses
- [x] Performance indexes on foreign keys
- [x] Factory switch function with transaction safety

### Frontend ✅ COMPLETE
- [x] Login page with case-insensitive username handling
- [x] Factory selection for multi-factory users
- [x] Factory switcher component for CEO/Director
- [x] Role-based dashboard routing
- [x] Auth service layer with Supabase integration
- [x] Zustand store for auth state
- [x] useAuth hook
- [x] Protected route components

### Seed Scripts ✅ COMPLETE
- [x] DatabaseSeeder class with admin API usage
- [x] Test factories creation (PLANT1, PLANT2)
- [x] Test users with role assignments
- [x] User-factory link creation
- [x] Fixed environment variable names (SEED_* → TEST_*)
- [x] Added user_settings.selected_factory_id population

### Testing ✅ COMPLETE
- [x] Basic E2E test structure
- [x] Auth helpers and utilities
- [x] JWT fixtures and RLS test scaffolding
- [x] AT-SEC-001 acceptance test (cross-factory denial)
- [x] AT-SEC-002 acceptance test (CEO/Director global access)
- [x] AT-SEC-003 acceptance test (factory switching)
- [x] Complete RLS probe tests implementation
- [x] Fix JWT fixtures (removed factory_id from JWT)

### CI/CD ✅ COMPLETE
- [x] Pipeline structure exists
- [x] Enable actual commands (removed continue-on-error: true)
- [x] Add proper environment variables for tests
- [x] Add Playwright browser caching
- [x] Ensure migrations and seeds run
- [x] Add acceptance tests to pipeline

### Documentation ✅ COMPLETE
- [x] Session Memory updated
- [x] Session Checklist created
- [x] Create auth troubleshooting guide
- [x] Update Implementation_Checklist.md when complete

---

## ✅ Step 1 Implementation COMPLETE

### All Todos Completed:
1. ✅ Fix seed script environment variables
2. ✅ Create AT-SEC-001 acceptance test
3. ✅ Create AT-SEC-002 acceptance test  
4. ✅ Create AT-SEC-003 acceptance test
5. ✅ Implement RLS probe tests
6. ✅ Fix Playwright E2E tests
7. ✅ Update CI/CD pipeline
8. ✅ Update final documentation

### Definition of Done for Step 1: ✅ ALL CRITERIA MET
- ✅ All acceptance tests (AT-SEC-001/002/003) created and ready
- ✅ RLS policies validated with probe tests
- ✅ Seed script creates all test users and populates user_settings
- ✅ CI/CD runs migrations, seeds, and tests successfully
- ✅ Playwright E2E tests stable
- ✅ Case-insensitive login verified
- ✅ Factory switching without re-authentication working
- ✅ Documentation updated

---

## 🚀 Ready for Step 2: Manage Company (Org primitives)