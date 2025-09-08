# CopperCore ERP - Authentication Troubleshooting Guide

## Common Authentication Issues

### 1. Login Failures

#### Invalid Credentials
**Symptoms:**
- Error message: "Invalid username or password"
- User can't login with correct credentials

**Troubleshooting:**
1. Verify user exists in database:
   ```sql
   SELECT username, role, active FROM users WHERE username = 'target_username';
   ```
2. Check if user is active:
   ```sql
   SELECT active FROM users WHERE username = 'target_username';
   ```
3. Verify auth.users entry exists:
   ```sql
   SELECT email, email_confirmed_at FROM auth.users WHERE email = 'username@coppercore.local';
   ```
4. If using seed script, ensure environment variables are set:
   ```bash
   echo $TEST_CEO_PASSWORD
   echo $TEST_DIRECTOR_PASSWORD
   ```

#### Case-Insensitive Login Issues
**Symptoms:**
- Login works with exact case but fails with different case
- "CEO" works but "ceo" doesn't

**Solution:**
- Verify citext extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'citext';
   ```
- Check username column type:
   ```sql
   \d+ users
   ```
- Should show `username | citext`

### 2. Factory Access Issues

#### User Can't Access Expected Factory
**Symptoms:**
- User sees "Access denied to factory" error
- Factory switching fails

**Troubleshooting:**
1. Check user-factory assignments:
   ```sql
   SELECT u.username, u.role, f.code as factory_code
   FROM users u
   JOIN user_factory_links ufl ON u.id = ufl.user_id
   JOIN factories f ON f.id = ufl.factory_id
   WHERE u.username = 'target_username';
   ```
2. Verify factory is active:
   ```sql
   SELECT code, name, active FROM factories WHERE code = 'PLANT1';
   ```
3. Check user_settings:
   ```sql
   SELECT us.selected_factory_id, f.code
   FROM user_settings us
   JOIN users u ON u.id = us.user_id
   LEFT JOIN factories f ON f.id = us.selected_factory_id
   WHERE u.username = 'target_username';
   ```

#### RLS Policies Blocking Access
**Symptoms:**
- Queries return empty results unexpectedly
- "Permission denied" errors

**Troubleshooting:**
1. Check if user is properly authenticated:
   ```sql
   SELECT jwt_user_id(), jwt_role(), user_is_global(), current_factory();
   ```
2. Debug user context:
   ```sql
   SELECT * FROM debug_user_context();
   ```
3. Test RLS policies manually:
   ```sql
   -- Run as service role
   SET row_security = off;
   SELECT * FROM target_table WHERE factory_id = 'target_factory_id';
   -- Then enable RLS and compare
   SET row_security = on;
   ```

### 3. Factory Switching Issues

#### Factory Switch Function Fails
**Symptoms:**
- switch_user_factory returns success = false
- Error messages about access denied

**Troubleshooting:**
1. Check error message in result:
   ```sql
   SELECT * FROM switch_user_factory('target_factory_id');
   ```
2. Verify user has access to target factory:
   ```sql
   SELECT user_has_factory_access('target_factory_id');
   ```
3. Check factory switch events for audit trail:
   ```sql
   SELECT * FROM factory_switch_events 
   WHERE user_id = jwt_user_id() 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

#### Factory Context Not Updating
**Symptoms:**
- current_factory() returns old value after switch
- Data scope doesn't change

**Solution:**
1. Verify user_settings was updated:
   ```sql
   SELECT selected_factory_id FROM user_settings 
   WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid());
   ```
2. Check if function is marked STABLE (may need session refresh)
3. Clear any client-side caching

### 4. Seed Script Issues

#### Passwords Not Working
**Symptoms:**
- Seed script reports missing passwords
- Users created but can't login

**Solution:**
1. Set environment variables:
   ```bash
   export TEST_CEO_PASSWORD=admin123
   export TEST_DIRECTOR_PASSWORD=dir123456
   export TEST_FM_PASSWORD=fm123456
   export TEST_FW_PASSWORD=fw123456
   export TEST_OFFICE_PASSWORD=office123
   export TEST_FM_MULTI_PASSWORD=multi123
   ```
2. Verify variables are set:
   ```bash
   env | grep TEST_.*_PASSWORD
   ```
3. Run seed script with proper environment:
   ```bash
   pnpm db:seed
   ```

#### User Creation Fails
**Symptoms:**
- Seed script fails during user creation
- "User already exists" errors

**Solution:**
1. Clean existing test data:
   ```bash
   tsx src/scripts/seed.ts clean
   ```
2. Check Supabase service role permissions
3. Verify email domain configuration (@coppercore.local)

### 5. JWT and Session Issues

#### JWT Claims Missing or Incorrect
**Symptoms:**
- jwt_role() returns null
- jwt_user_id() returns null
- RLS policies not working

**Troubleshooting:**
1. Check JWT structure:
   ```typescript
   // In browser console
   const session = await supabase.auth.getSession();
   console.log('JWT payload:', JSON.parse(atob(session.data.session.access_token.split('.')[1])));
   ```
2. Verify custom claims are present:
   - `role` should be present
   - `user_id` should match users.id
   - `username` should be present
   - `factory_id` should NOT be present (we use current_factory())

#### Session Persistence Issues
**Symptoms:**
- User logged out on page refresh
- Session not persisting across browser restarts

**Solution:**
1. Check Supabase client configuration:
   ```typescript
   // auth.persistSession should be true
   const supabase = createClient(url, key, {
     auth: { persistSession: true }
   });
   ```
2. Verify localStorage is working:
   ```javascript
   console.log(localStorage.getItem('supabase.auth.token'));
   ```

### 6. Development Environment Issues

#### Database Connection Failures
**Symptoms:**
- "Connection refused" errors
- Migrations fail to run

**Solution:**
1. Check DATABASE_URL in .env:
   ```bash
   echo $DATABASE_URL
   ```
2. Verify Postgres is running:
   ```bash
   pg_isready -h localhost -p 5432
   ```
3. Test connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

#### Environment Variables Not Loading
**Symptoms:**
- Vite can't find VITE_* variables
- Server can't find regular variables

**Solution:**
1. Check .env file exists and has correct format
2. Verify Vite variables start with VITE_:
   ```bash
   grep VITE_ .env
   ```
3. Restart development server after .env changes

## Testing Your Auth Implementation

### Quick Health Check
Run these queries to verify auth system health:

```sql
-- 1. Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('citext');

-- 2. Check test users exist
SELECT username, role, active FROM users WHERE username IN ('ceo', 'director', 'fm1', 'fw1', 'office2');

-- 3. Check factories exist
SELECT code, name, active FROM factories;

-- 4. Check user-factory assignments
SELECT u.username, f.code FROM users u 
JOIN user_factory_links ufl ON u.id = ufl.user_id 
JOIN factories f ON f.id = ufl.factory_id;

-- 5. Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

### End-to-End Test
1. Try logging in as each test user
2. Verify factory switching works for global users
3. Test cross-factory access is blocked for scoped users
4. Confirm case-insensitive login works

## Getting Help

If these troubleshooting steps don't resolve your issue:

1. Check the session logs in `docs/Session_Memory.md`
2. Review the Implementation Checklist in `docs/Session_Checklist.md` 
3. Run the acceptance tests: `pnpm test tests/acceptance/`
4. Check RLS probe tests: `pnpm test:rls`
5. Review the PRD requirements in `docs/PRD/PRD_v1.5.md`

## Prevention

To avoid common auth issues:
- Always use the seed script for test data
- Never hardcode factory_id in JWT claims
- Keep RLS policies simple and well-documented
- Test with multiple user roles regularly
- Use the debug_user_context() function for troubleshooting
- Monitor factory_switch_events for audit trail