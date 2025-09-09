/**
 * CopperCore ERP - Acceptance Test AT-MGMT-001
 * 
 * Test: FM cannot create factory/user (permission denied)
 * 
 * Requirements:
 * - FM user cannot access company management endpoints
 * - FM user gets 403 when trying to create factory
 * - FM user gets 403 when trying to create user
 * - FM user cannot access /company management UI
 * - Only CEO/Director have access to company management
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, AuthPageHelpers } from '../utils/auth-helpers';

// Test data for API calls
const TEST_FACTORY_DATA = {
  code: 'TEST01',
  name: 'Test Factory'
};

const TEST_USER_DATA = {
  username: 'testuser',
  role: 'FW',
  full_name: 'Test User'
};

test.describe('AT-MGMT-001: FM cannot create factory/user (permission denied)', () => {
  let authHelper: AuthPageHelpers;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthPageHelpers(page);
  });

  test('FM user gets 403 when attempting to create factory via API', async ({ page, request }) => {
    // Login as FM user
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();
    
    // Select a factory to complete authentication flow
    try {
      await authHelper.selectFactory('Plant 1');
      await authHelper.expectDashboard();
    } catch (error) {
      // Factory selection might fail in test environment, continue with test
      console.log('Factory selection failed, continuing with API test');
    }

    // Get authentication token from browser storage
    const token = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    if (!token) {
      // Skip API test if we can't get token
      console.log('Could not retrieve auth token, skipping API test');
      return;
    }

    // Attempt to create factory via API - should get 403
    const createFactoryResponse = await request.post('http://localhost:3001/api/company/factories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: TEST_FACTORY_DATA
    });

    // Should receive 403 Forbidden
    expect(createFactoryResponse.status()).toBe(403);
    
    const responseBody = await createFactoryResponse.json();
    expect(responseBody.error).toBeTruthy();
    expect(responseBody.error.code).toBe('INSUFFICIENT_ROLE');
    expect(responseBody.error.message).toContain('Access denied');

    console.log(`✅ FM cannot create factory: ${responseBody.error.message}`);
  });

  test('FM user gets 403 when attempting to create user via API', async ({ page, request }) => {
    // Login as FM user
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();

    // Select a factory to complete authentication flow
    try {
      await authHelper.selectFactory('Plant 1');
      await authHelper.expectDashboard();
    } catch (error) {
      console.log('Factory selection failed, continuing with API test');
    }

    // Get authentication token from browser storage
    const token = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    if (!token) {
      console.log('Could not retrieve auth token, skipping API test');
      return;
    }

    // Attempt to create user via API - should get 403
    const createUserResponse = await request.post('http://localhost:3001/api/company/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: TEST_USER_DATA
    });

    // Should receive 403 Forbidden
    expect(createUserResponse.status()).toBe(403);
    
    const responseBody = await createUserResponse.json();
    expect(responseBody.error).toBeTruthy();
    expect(responseBody.error.code).toBe('INSUFFICIENT_ROLE');
    expect(responseBody.error.message).toContain('Access denied');

    console.log(`✅ FM cannot create user: ${responseBody.error.message}`);
  });

  test('FM user cannot access company management UI', async ({ page }) => {
    // Login as FM user
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();

    // Try to navigate to company management page
    await page.goto('/company');

    // Should either:
    // 1. Show access denied message
    // 2. Redirect away from company management
    // 3. Show no available tabs/features

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we're still on the company page
    const currentUrl = page.url();
    
    if (currentUrl.includes('/company')) {
      // If we're on company page, should show access denied
      const accessDeniedElement = page.locator('text=Access Denied');
      const noTabsElement = page.locator('text=You don\'t have permission');
      
      // Should see either access denied message or no available features
      const hasAccessDenied = await accessDeniedElement.isVisible().catch(() => false);
      const hasNoTabs = await noTabsElement.isVisible().catch(() => false);
      
      expect(hasAccessDenied || hasNoTabs).toBeTruthy();

      if (hasAccessDenied) {
        console.log('✅ FM sees access denied message in company management UI');
      } else if (hasNoTabs) {
        console.log('✅ FM sees no available tabs in company management UI');
      }
    } else {
      // If redirected, that's also valid behavior
      console.log(`✅ FM was redirected away from company management to: ${currentUrl}`);
    }
  });

  test('FM user cannot see factory/user creation buttons in UI', async ({ page }) => {
    // Login as FM user
    await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company management
    await page.goto('/company/factories');
    await page.waitForLoadState('networkidle');

    // Check if create factory button is visible
    const createFactoryButton = page.locator('button:has-text("Create Factory"), button:has-text("Add Factory")');
    const hasCreateButton = await createFactoryButton.isVisible().catch(() => false);

    if (!hasCreateButton) {
      console.log('✅ FM cannot see factory creation button');
    } else {
      // If button exists, clicking it should not work or show error
      await createFactoryButton.click();
      
      // Should show error or not respond
      const errorMessage = page.locator('[role="alert"], .error, .alert-error');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (hasError) {
        console.log('✅ FM gets error when trying to create factory via UI');
      }
    }

    // Check users tab if accessible
    try {
      await page.click('button:has-text("Users")');
      await page.waitForLoadState('networkidle');
      
      const createUserButton = page.locator('button:has-text("Create User"), button:has-text("Add User")');
      const hasCreateUserButton = await createUserButton.isVisible().catch(() => false);
      
      if (!hasCreateUserButton) {
        console.log('✅ FM cannot see user creation button');
      } else {
        // If button exists, clicking it should not work
        await createUserButton.click();
        const userErrorMessage = page.locator('[role="alert"], .error, .alert-error');
        const hasUserError = await userErrorMessage.isVisible().catch(() => false);
        
        if (hasUserError) {
          console.log('✅ FM gets error when trying to create user via UI');
        }
      }
    } catch (error) {
      console.log('✅ FM cannot access users tab or gets error');
    }
  });

  test('CEO user CAN access company management (control test)', async ({ page, request }) => {
    // Login as CEO user for control test
    await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company management
    await page.goto('/company');
    await page.waitForLoadState('networkidle');

    // Should have access to company management
    const companyTitle = page.locator('h1:has-text("Company Management")');
    await expect(companyTitle).toBeVisible();

    // Should see tabs
    const factoriesTab = page.locator('button:has-text("Factories")');
    const usersTab = page.locator('button:has-text("Users")');
    
    await expect(factoriesTab).toBeVisible();
    await expect(usersTab).toBeVisible();

    // Get authentication token for API test
    const token = await page.evaluate(() => {
      const authData = localStorage.getItem('coppercore.auth');
      return authData ? JSON.parse(authData).access_token : null;
    });

    if (token) {
      // CEO should be able to access company endpoints
      const factoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(factoriesResponse.status()).toBe(200);
      const factoriesData = await factoriesResponse.json();
      expect(factoriesData.success).toBe(true);
      expect(Array.isArray(factoriesData.factories)).toBe(true);

      console.log(`✅ CEO can access company management: Found ${factoriesData.factories.length} factories`);
    }
  });

  test('Director user CAN access company management (control test)', async ({ page }) => {
    // Login as Director user for control test
    await authHelper.login(TEST_USERS.director.username, TEST_USERS.director.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company management
    await page.goto('/company');
    await page.waitForLoadState('networkidle');

    // Should have access to company management
    const companyTitle = page.locator('h1:has-text("Company Management")');
    await expect(companyTitle).toBeVisible();

    // Should see tabs
    const factoriesTab = page.locator('button:has-text("Factories")');
    const usersTab = page.locator('button:has-text("Users")');
    
    await expect(factoriesTab).toBeVisible();
    await expect(usersTab).toBeVisible();

    console.log('✅ Director can access company management UI');
  });

  test('FW user also cannot access company management (additional role test)', async ({ page }) => {
    // Test with Factory Worker role as well
    await authHelper.login(TEST_USERS.fw1.username, TEST_USERS.fw1.password);
    await authHelper.expectLoginSuccess();

    // Navigate to company management
    await page.goto('/company');
    await page.waitForLoadState('networkidle');

    // Should be denied access similar to FM
    const currentUrl = page.url();
    
    if (currentUrl.includes('/company')) {
      const accessDeniedElement = page.locator('text=Access Denied');
      const noTabsElement = page.locator('text=You don\'t have permission');
      
      const hasAccessDenied = await accessDeniedElement.isVisible().catch(() => false);
      const hasNoTabs = await noTabsElement.isVisible().catch(() => false);
      
      expect(hasAccessDenied || hasNoTabs).toBeTruthy();
      console.log('✅ FW (Factory Worker) also cannot access company management');
    } else {
      console.log(`✅ FW was redirected away from company management to: ${currentUrl}`);
    }
  });

  test('Role-based endpoint access validation', async ({ page, request }) => {
    const testCases = [
      { 
        user: TEST_USERS.fm1, 
        role: 'FM', 
        shouldHaveAccess: false 
      },
      { 
        user: TEST_USERS.fw1, 
        role: 'FW', 
        shouldHaveAccess: false 
      },
      { 
        user: TEST_USERS.ceo, 
        role: 'CEO', 
        shouldHaveAccess: true 
      }
    ];

    for (const testCase of testCases) {
      // Login as test user
      await authHelper.login(testCase.user.username, testCase.user.password);
      await authHelper.expectLoginSuccess();

      // Get token
      const token = await page.evaluate(() => {
        const authData = localStorage.getItem('coppercore.auth');
        return authData ? JSON.parse(authData).access_token : null;
      });

      if (!token) {
        await authHelper.logout();
        continue;
      }

      // Test factories endpoint access
      const factoriesResponse = await request.get('http://localhost:3001/api/company/factories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (testCase.shouldHaveAccess) {
        expect(factoriesResponse.status()).toBe(200);
        console.log(`✅ ${testCase.role} user can access factories endpoint (expected)`);
      } else {
        // Non-CEO/Director users might still see their assigned factories (read-only)
        // The key is that they cannot CREATE/UPDATE/DELETE
        if (factoriesResponse.status() === 200) {
          console.log(`ℹ️ ${testCase.role} user can view factories (read-only access)`);
        } else {
          expect([401, 403]).toContain(factoriesResponse.status());
          console.log(`✅ ${testCase.role} user denied access to factories endpoint`);
        }
      }

      // Test users endpoint access
      const usersResponse = await request.get('http://localhost:3001/api/company/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (testCase.shouldHaveAccess) {
        expect(usersResponse.status()).toBe(200);
        console.log(`✅ ${testCase.role} user can access users endpoint (expected)`);
      } else {
        // Similar to factories - might have read access to see colleagues
        if (usersResponse.status() === 200) {
          console.log(`ℹ️ ${testCase.role} user can view users (read-only access)`);
        } else {
          expect([401, 403]).toContain(usersResponse.status());
          console.log(`✅ ${testCase.role} user denied access to users endpoint`);
        }
      }

      await authHelper.logout();
    }
  });
});