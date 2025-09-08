/**
 * CopperCore ERP - RLS Policy Tests
 * 
 * Test suite to verify Row Level Security policies work correctly
 * for factory scoping and role-based access control.
 */

import { testRLSAccess } from './jwt-fixtures';

/**
 * Test RLS policies for factory scoping
 * 
 * This will be expanded as we implement each module:
 * - AT-SEC-001: Cross-factory read denied for non-global users
 * - AT-SEC-002: CEO/Director global read allowed  
 */
export async function runRLSTests() {
  console.log('🧪 Starting RLS Policy Tests...\n');

  try {
    // Test 1: Factory Scoping
    console.log('📋 Test Group: Factory Scoping');
    await testFactoryScoping();

    // Test 2: Role-Based Access
    console.log('\n📋 Test Group: Role-Based Access');
    await testRoleBasedAccess();

    // Test 3: Global Role Access
    console.log('\n📋 Test Group: Global Role Access');
    await testGlobalRoleAccess();

    console.log('\n✨ RLS Tests Complete - All policy tests executed');
  } catch (error) {
    console.error('\n❌ RLS Tests Failed:', error);
    throw error;
  }
}

/**
 * Test that factory-scoped users can only see their own factory data
 */
async function testFactoryScoping() {
  console.log('  🧪 Testing factory scoping for users table...');
  
  // Test FM from Factory 1 can only see users in their factory
  await testRLSAccess('fm_fac1', 'users', 'limited', 'FM1 sees limited users (factory scoped)');
  
  // Test FM from Factory 2 can only see users in their factory  
  await testRLSAccess('fm_fac2', 'users', 'limited', 'FM2 sees limited users (factory scoped)');
  
  console.log('  🧪 Testing factory scoping for user_factory_assignments...');
  
  // Test factory links are scoped properly
  await testRLSAccess('fm_fac1', 'user_factory_assignments', 'limited', 'FM1 sees limited factory assignments');
  await testRLSAccess('fw_fac1', 'user_factory_assignments', 'limited', 'FW1 sees limited factory assignments');
  
  console.log('  ✅ Factory scoping tests completed');
}

/**
 * Test that roles have appropriate access levels
 */
async function testRoleBasedAccess() {
  console.log('  🧪 Testing role-based access for users table...');
  
  // CEO should see all users regardless of factory
  await testRLSAccess('ceo', 'users', 'any', 'CEO sees all users');
  
  // FW should have limited access to users
  await testRLSAccess('fw_fac1', 'users', 'limited', 'FW sees limited users');
  
  console.log('  🧪 Testing role-based access for factories table...');
  
  // CEO should see all factories
  await testRLSAccess('ceo', 'factories', 'any', 'CEO sees all factories');
  
  // FM should see accessible factories only
  await testRLSAccess('fm_fac1', 'factories', 'limited', 'FM sees limited factories');
  
  console.log('  ✅ Role-based access tests completed');
}

/**
 * Test that global roles (CEO/Director) can access all factories
 */
async function testGlobalRoleAccess() {
  console.log('  🧪 Testing global role access for CEO...');
  
  // CEO should see data from all factories
  await testRLSAccess('ceo', 'user_factory_assignments', 'any', 'CEO sees all user-factory assignments');
  await testRLSAccess('ceo', 'factories', 'any', 'CEO sees all factories');
  
  console.log('  🧪 Testing global role access for Director...');
  
  // Director should see data from all factories
  await testRLSAccess('director', 'user_factory_assignments', 'any', 'Director sees all user-factory assignments');
  await testRLSAccess('director', 'factories', 'any', 'Director sees all factories');
  
  console.log('  ✅ Global role access tests completed');
}

/**
 * Helper to run RLS tests during CI/CD
 */
export async function runRLSTestsForCI() {
  try {
    await runRLSTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ RLS Tests Failed:', error);
    process.exit(1);
  }
}

// Allow running tests directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRLSTestsForCI();
}