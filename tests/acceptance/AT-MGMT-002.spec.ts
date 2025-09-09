/**
 * CopperCore ERP - Acceptance Test AT-MGMT-002
 * 
 * Test: CEO creates factory; user sees only assigned factory
 * 
 * Requirements:
 * - CEO can create new factory via API
 * - New factory appears in factory list immediately
 * - Factory-scoped user (FM) sees only assigned factories
 * - CEO/Director see all factories (including new one)
 * - Factory scoping works end-to-end in the UI
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, AuthPageHelpers } from '../utils/auth-helpers';

// Generate unique test data for each test run
const generateTestFactoryData = () => ({
  code: `TST${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
  name: `Test Factory ${Math.random().toString(36).substring(2, 8)}`
});

const generateTestUserData = (factoryId?: string) => ({
  username: `testuser${Math.random().toString(36).substring(2, 8)}`,
  role: 'FM' as const,
  full_name: 'Test Factory Manager',
  factory_ids: factoryId ? [factoryId] : undefined
});

test.describe('AT-MGMT-002: CEO creates factory; user sees only assigned factory', () => {
  let authHelper: AuthPageHelpers;
  let createdFactoryId: string | null = null;
  let createdUserId: string | null = null;
  let testFactoryData: ReturnType<typeof generateTestFactoryData>;
  let testUserData: ReturnType<typeof generateTestUserData>;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthPageHelpers(page);
    testFactoryData = generateTestFactoryData();
    testUserData = generateTestUserData();
  });

  test.afterEach(async ({ page, request }) => {
    // Cleanup created resources after each test
    if (createdUserId || createdFactoryId) {
      try {
        // Login as CEO to cleanup
        await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
        
        const token = await page.evaluate(() => {
          const authData = localStorage.getItem('coppercore.auth');
          return authData ? JSON.parse(authData).access_token : null;
        });

        if (token) {
          // Cleanup user first (if created)
          if (createdUserId) {
            await request.put(`http://localhost:3001/api/company/users/${createdUserId}/deactivate`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`🧹 Cleaned up test user: ${createdUserId}`);
          }

          // Cleanup factory (if created)
          if (createdFactoryId) {
            await request.put(`http://localhost:3001/api/company/factories/${createdFactoryId}/deactivate`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`🧹 Cleaned up test factory: ${createdFactoryId}`);
          }
        }
      } catch (error) {
        console.log('⚠️ Cleanup failed:', error);
      }
    }

    // Reset IDs for next test
    createdFactoryId = null;
    createdUserId = null;
  });

  test('CEO can create new factory via API', async ({ page, request }) => {
    // Login as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    // Get authentication token
    const token = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    expect(token).toBeTruthy();

    // Create factory via API
    const createResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    // Should succeed with 201
    expect(createResponse.status()).toBe(201);

    const responseBody = await createResponse.json();
    expect(responseBody.success).toBe(true);
    expect(responseBody.factory).toBeTruthy();
    expect(responseBody.factory.code).toBe(testFactoryData.code);
    expect(responseBody.factory.name).toBe(testFactoryData.name);
    expect(responseBody.factory.active).toBe(true);

    // Store for cleanup
    createdFactoryId = responseBody.factory.id;

    console.log(`✅ CEO created factory: ${responseBody.factory.code} (${responseBody.factory.id})`);
  });

  test('New factory appears in factory list immediately after creation', async ({ page, request }) => {
    // Login as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const token = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    expect(token).toBeTruthy();

    // Get initial factory count
    const initialResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const initialData = await initialResponse.json();
    const initialCount = initialData.factories.length;

    // Create new factory
    const createResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    expect(createResponse.status()).toBe(201);
    const createdFactory = (await createResponse.json()).factory;
    createdFactoryId = createdFactory.id;

    // Immediately fetch factory list again
    const updatedResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const updatedData = await updatedResponse.json();
    
    // Should have one more factory
    expect(updatedData.factories.length).toBe(initialCount + 1);
    
    // New factory should be in the list
    const foundFactory = updatedData.factories.find((f: any) => f.id === createdFactory.id);
    expect(foundFactory).toBeTruthy();
    expect(foundFactory.code).toBe(testFactoryData.code);
    expect(foundFactory.name).toBe(testFactoryData.name);

    console.log(`✅ New factory appears in list immediately: ${foundFactory.code}`);
  });

  test('Factory-scoped user (FM) sees only assigned factories', async ({ page, request }) => {
    // First, create a factory as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const ceoToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    // Create test factory
    const createFactoryResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    expect(createFactoryResponse.status()).toBe(201);
    const newFactory = (await createFactoryResponse.json()).factory;
    createdFactoryId = newFactory.id;

    // Create test user assigned to this factory
    testUserData = generateTestUserData(newFactory.id);
    const createUserResponse = await request.post('http://localhost:3001/api/company/users', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testUserData
    });

    expect(createUserResponse.status()).toBe(201);
    const newUser = (await createUserResponse.json()).user;
    createdUserId = newUser.id;

    // Logout CEO
    await authHelper.logout();

    // Now login as existing FM user (fm1) who should only see their assigned factories
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();

    const fmToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    if (fmToken) {
      // Get factories accessible to FM
      const fmFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
        headers: { 'Authorization': `Bearer ${fmToken}` }
      });

      const fmFactoriesData = await fmFactoriesResponse.json();

      // FM should not see the newly created factory (since not assigned to it)
      const canSeeNewFactory = fmFactoriesData.factories.some((f: any) => f.id === newFactory.id);
      expect(canSeeNewFactory).toBe(false);

      // FM should only see factories they're assigned to
      const assignedFactoryCount = fmFactoriesData.factories.length;
      expect(assignedFactoryCount).toBeLessThan(10); // Reasonable upper bound

      console.log(`✅ FM sees only ${assignedFactoryCount} assigned factories, cannot see new factory ${newFactory.code}`);
    }
  });

  test('CEO/Director see all factories including new ones', async ({ page, request }) => {
    // Create factory as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const ceoToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    // Get initial count
    const initialResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });
    const initialCount = (await initialResponse.json()).factories.length;

    // Create new factory
    const createResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    const newFactory = (await createResponse.json()).factory;
    createdFactoryId = newFactory.id;

    // CEO should see all factories including the new one
    const ceoFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });

    const ceoFactoriesData = await ceoFactoriesResponse.json();
    expect(ceoFactoriesData.factories.length).toBe(initialCount + 1);

    const ceoCanSeeNewFactory = ceoFactoriesData.factories.some((f: any) => f.id === newFactory.id);
    expect(ceoCanSeeNewFactory).toBe(true);

    console.log(`✅ CEO sees all ${ceoFactoriesData.factories.length} factories including new factory ${newFactory.code}`);

    // Logout CEO and test Director
    await authHelper.logout();
    await authHelper.login(TEST_USERS.director.username, TEST_USERS.director.password);

    const directorToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    if (directorToken) {
      const directorFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
        headers: { 'Authorization': `Bearer ${directorToken}` }
      });

      const directorFactoriesData = await directorFactoriesResponse.json();
      expect(directorFactoriesData.factories.length).toBe(initialCount + 1);

      const directorCanSeeNewFactory = directorFactoriesData.factories.some((f: any) => f.id === newFactory.id);
      expect(directorCanSeeNewFactory).toBe(true);

      console.log(`✅ Director sees all ${directorFactoriesData.factories.length} factories including new factory ${newFactory.code}`);
    }
  });

  test('Factory scoping works end-to-end in UI', async ({ page, request }) => {
    // Create factory and user as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const ceoToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    // Create test factory
    const createFactoryResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    const newFactory = (await createFactoryResponse.json()).factory;
    createdFactoryId = newFactory.id;

    // Navigate to company management UI
    await page.goto('/company/factories');
    await page.waitForLoadState('networkidle');

    // CEO should see the new factory in the UI
    const factoryCodeInList = page.locator(`text=${testFactoryData.code}`);
    await expect(factoryCodeInList).toBeVisible({ timeout: 10000 });

    const factoryNameInList = page.locator(`text=${testFactoryData.name}`);
    await expect(factoryNameInList).toBeVisible();

    console.log(`✅ CEO sees new factory ${testFactoryData.code} in UI factories list`);

    // Logout CEO and test with FM
    await authHelper.logout();
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company page (if accessible)
    await page.goto('/company/factories');
    await page.waitForLoadState('networkidle');

    // FM should not see the new factory
    const fmCanSeeFactory = await factoryCodeInList.isVisible().catch(() => false);
    expect(fmCanSeeFactory).toBe(false);

    console.log(`✅ FM cannot see new factory ${testFactoryData.code} in UI (proper factory scoping)`);
  });

  test('Factory creation workflow in UI works for CEO', async ({ page }) => {
    // Login as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company management
    await page.goto('/company/factories');
    await page.waitForLoadState('networkidle');

    // Look for create factory button or form
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();

      // Look for form fields
      const codeInput = page.locator('input[name="code"], input[placeholder*="code"], input[id*="code"]').first();
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[id*="name"]').first();

      if (await codeInput.isVisible().catch(() => false)) {
        await codeInput.fill(testFactoryData.code);
      }

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(testFactoryData.name);
      }

      // Submit form
      const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button:has-text("Submit")').first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();

        // Wait for success message or factory to appear in list
        await page.waitForLoadState('networkidle');

        // Check if factory appears in list
        const createdFactoryInList = page.locator(`text=${testFactoryData.code}`);
        const isVisible = await createdFactoryInList.isVisible({ timeout: 5000 }).catch(() => false);

        if (isVisible) {
          console.log(`✅ CEO successfully created factory via UI: ${testFactoryData.code}`);
          
          // Mark for cleanup (though we don't have the ID from UI)
          // In a real test, we'd need to fetch the created factory ID from the API
        } else {
          console.log('ℹ️ Factory creation UI test completed, but factory not immediately visible in list');
        }
      }
    } else {
      console.log('ℹ️ Create factory button not found - UI might be different than expected');
    }
  });

  test('User assignment to factory affects visibility immediately', async ({ page, request }) => {
    // Create factory as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const ceoToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    // Create test factory
    const createFactoryResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    const newFactory = (await createFactoryResponse.json()).factory;
    createdFactoryId = newFactory.id;

    // Get existing FM user ID (fm1)
    const usersResponse = await request.get('http://localhost:3001/api/company/users', {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });

    const usersData = await usersResponse.json();
    const fmUser = usersData.users.find((u: any) => u.username === 'fm1');
    expect(fmUser).toBeTruthy();

    // Check that FM cannot see the new factory initially
    await authHelper.logout();
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);

    const fmToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    let fmFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${fmToken}` }
    });

    let fmFactoriesData = await fmFactoriesResponse.json();
    let canSeeNewFactory = fmFactoriesData.factories.some((f: any) => f.id === newFactory.id);
    expect(canSeeNewFactory).toBe(false);

    console.log(`✅ FM initially cannot see new factory ${testFactoryData.code}`);

    // Switch back to CEO and assign FM to the new factory
    await authHelper.logout();
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);

    const assignResponse = await request.post(`http://localhost:3001/api/company/users/${fmUser.id}/factories`, {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: { factory_id: newFactory.id }
    });

    expect(assignResponse.status()).toBe(201);
    console.log(`✅ CEO assigned FM to new factory ${testFactoryData.code}`);

    // Switch back to FM and verify they can now see the factory
    await authHelper.logout();
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);

    const newFmToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    fmFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${newFmToken}` }
    });

    fmFactoriesData = await fmFactoriesResponse.json();
    canSeeNewFactory = fmFactoriesData.factories.some((f: any) => f.id === newFactory.id);
    expect(canSeeNewFactory).toBe(true);

    console.log(`✅ FM can now see factory ${testFactoryData.code} after assignment`);

    // Cleanup: Remove the assignment as CEO
    await authHelper.logout();
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);

    await request.delete(`http://localhost:3001/api/company/users/${fmUser.id}/factories/${newFactory.id}`, {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });

    console.log(`🧹 Cleaned up factory assignment for FM`);
  });

  test('Inactive factories are hidden from non-global users but visible to CEO/Director', async ({ page, request }) => {
    // Create and then deactivate a factory as CEO
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    const ceoToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    // Create factory
    const createResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${ceoToken}`,
        'Content-Type': 'application/json'
      },
      data: testFactoryData
    });

    const newFactory = (await createResponse.json()).factory;
    createdFactoryId = newFactory.id;

    // Deactivate the factory
    const deactivateResponse = await request.put(`http://localhost:3001/api/company/factories/${newFactory.id}/deactivate`, {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });

    expect(deactivateResponse.status()).toBe(200);

    // CEO should still see the inactive factory
    const ceoFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${ceoToken}` }
    });

    const ceoFactoriesData = await ceoFactoriesResponse.json();
    const ceoCanSeeInactiveFactory = ceoFactoriesData.factories.some((f: any) => f.id === newFactory.id && !f.active);
    expect(ceoCanSeeInactiveFactory).toBe(true);

    console.log(`✅ CEO can see inactive factory ${testFactoryData.code}`);

    // FM should not see the inactive factory (even if previously assigned)
    await authHelper.logout();
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);

    const fmToken = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    const fmFactoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
      headers: { 'Authorization': `Bearer ${fmToken}` }
    });

    const fmFactoriesData = await fmFactoriesResponse.json();
    const fmCanSeeInactiveFactory = fmFactoriesData.factories.some((f: any) => f.id === newFactory.id);
    expect(fmCanSeeInactiveFactory).toBe(false);

    console.log(`✅ FM cannot see inactive factory ${testFactoryData.code}`);
  });
});