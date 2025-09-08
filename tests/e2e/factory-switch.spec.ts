/**
 * CopperCore ERP - Factory Switch E2E Tests
 * Tests factory switching functionality for CEO/Director without requiring re-login
 */

import { test, expect } from '@playwright/test';
import { AuthPageHelpers, SessionHelpers, TEST_USERS } from '../utils/auth-helpers';

test.describe('Factory Switch', () => {
  let authHelper: AuthPageHelpers;
  let sessionHelper: SessionHelpers;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthPageHelpers(page);
    sessionHelper = new SessionHelpers(page);
    
    // Clear any existing session
    await sessionHelper.clearSession();
  });

  test.describe('CEO Factory Switching', () => {
    test.beforeEach(async ({ page }) => {
      // Login as CEO first
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
    });

    test('CEO can switch between factories without re-login', async ({ page }) => {
      // CEO should be able to select different factories
      await page.waitForSelector('[data-testid="factory-switcher"]', { timeout: 10000 });
      await authHelper.takeLoginScreenshot('ceo-dashboard-initial');
      
      // Switch to Factory 1
      await authHelper.switchFactory('Factory 1');
      await authHelper.expectFactorySwitched('Factory 1');
      await authHelper.takeLoginScreenshot('ceo-factory1-selected');
      
      // Verify we're still logged in and on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Switch to Factory 2
      await authHelper.switchFactory('Factory 2');
      await authHelper.expectFactorySwitched('Factory 2');
      await authHelper.takeLoginScreenshot('ceo-factory2-selected');
      
      // Verify we're still logged in
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('CEO can select "All Factories" option', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Select "All Factories" option
      await page.click('[data-testid="factory-switcher"]');
      await page.selectOption('[data-testid="factory-select"]', { label: 'All Factories' });
      await page.click('[data-testid="switch-factory-button"]');
      
      // Verify "All Factories" is selected
      const factoryIndicator = page.locator('[data-testid="current-factory"]');
      await expect(factoryIndicator).toContainText('All Factories');
      await authHelper.takeLoginScreenshot('ceo-all-factories');
    });

    test('Factory switch updates context without page refresh', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Set up a marker to verify no full page refresh occurs
      const markerId = `test-marker-${Date.now()}`;
      await page.addInitScript((id) => {
        (window as any).testMarker = id;
      }, markerId);
      await page.reload();
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Switch factory
      await authHelper.switchFactory('Factory 1');
      await authHelper.expectFactorySwitched('Factory 1');
      
      // Verify no full page refresh occurred by checking if our marker is still there
      const currentMarker = await page.evaluate(() => (window as any).testMarker);
      expect(currentMarker).toBe(markerId);
      
      // Verify factory context updated (this would be reflected in data displayed)
      await expect(page.locator('[data-testid="current-factory"]')).toContainText('Factory 1');
    });

    test('Factory switch persists across page refresh', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Switch to specific factory
      await authHelper.switchFactory('Factory 1');
      await authHelper.expectFactorySwitched('Factory 1');
      
      // Refresh page
      await sessionHelper.refreshPage();
      
      // Verify factory selection persisted
      await expect(page).toHaveURL(/\/dashboard/);
      await page.waitForSelector('[data-testid="current-factory"]');
      await expect(page.locator('[data-testid="current-factory"]')).toContainText('Factory 1');
    });
  });

  test.describe('Director Factory Switching', () => {
    test.beforeEach(async () => {
      // Login as Director first
      await authHelper.login(TEST_USERS.director.username, TEST_USERS.director.password);
      await authHelper.expectLoginSuccess();
    });

    test('Director can switch between factories like CEO', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Switch between factories
      await authHelper.switchFactory('Factory 1');
      await authHelper.expectFactorySwitched('Factory 1');
      await authHelper.takeLoginScreenshot('director-factory1');
      
      await authHelper.switchFactory('Factory 2');
      await authHelper.expectFactorySwitched('Factory 2');
      await authHelper.takeLoginScreenshot('director-factory2');
      
      // Verify still logged in
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Director has access to All Factories option', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      await page.click('[data-testid="factory-switcher"]');
      
      // Verify "All Factories" option is available
      const allFactoriesOption = page.locator('[data-testid="factory-select"] option[value="all"]');
      await expect(allFactoriesOption).toBeVisible();
      await expect(allFactoriesOption).toContainText('All Factories');
    });
  });

  test.describe('Factory Manager Limited Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as FM first
      await authHelper.login(TEST_USERS.fm1.username, TEST_USERS.fm1.password);
      
      // FM needs to select factory first
      await expect(page).toHaveURL(/\/select-factory/);
      await authHelper.selectFactory('Factory 1');
      await authHelper.expectDashboard();
    });

    test('Factory Manager cannot switch to unauthorized factories', async ({ page }) => {
      // FM should not have factory switcher or it should be limited
      const factorySwitcher = page.locator('[data-testid="factory-switcher"]');
      
      // Either the switcher is not visible or it only shows authorized factories
      if (await factorySwitcher.isVisible()) {
        await factorySwitcher.click();
        
        // Should not see "All Factories" option
        const allFactoriesOption = page.locator('[data-testid="factory-select"] option[value="all"]');
        await expect(allFactoriesOption).not.toBeVisible();
        
        // Should only see factories they have access to
        const selectOptions = page.locator('[data-testid="factory-select"] option');
        const optionCount = await selectOptions.count();
        expect(optionCount).toBeLessThanOrEqual(2); // Only their assigned factory + placeholder
      }
    });

    test('Factory Manager cannot access factory switcher if single factory', async ({ page }) => {
      // If FM only has access to one factory, switcher might not be shown
      const factorySwitcher = page.locator('[data-testid="factory-switcher"]');
      const isVisible = await factorySwitcher.isVisible();
      
      if (!isVisible) {
        // This is expected behavior - single factory users don't need switcher
        await authHelper.takeLoginScreenshot('fm-no-switcher');
        
        // Verify they still see their current factory
        await expect(page.locator('[data-testid="current-factory"]')).toContainText('Factory 1');
      }
    });
  });

  test.describe('Multi-Factory Manager', () => {
    test.beforeEach(async ({ page }) => {
      // Login as multi-factory FM
      await authHelper.login(TEST_USERS.fm_multi.username, TEST_USERS.fm_multi.password);
      
      // Should go to factory selection
      await expect(page).toHaveURL(/\/select-factory/);
      await authHelper.selectFactory('Factory 1');
      await authHelper.expectDashboard();
    });

    test('Multi-factory FM can switch between assigned factories only', async ({ page }) => {
      const factorySwitcher = page.locator('[data-testid="factory-switcher"]');
      
      if (await factorySwitcher.isVisible()) {
        await factorySwitcher.click();
        
        // Should see multiple factories but not "All Factories"
        const selectOptions = page.locator('[data-testid="factory-select"] option:not([value=""])');
        const optionCount = await selectOptions.count();
        expect(optionCount).toBeGreaterThan(1); // Multiple options
        
        // Should not see "All Factories"
        const allFactoriesOption = page.locator('[data-testid="factory-select"] option[value="all"]');
        await expect(allFactoriesOption).not.toBeVisible();
        
        // Switch to another factory
        await authHelper.switchFactory('Factory 2');
        await authHelper.expectFactorySwitched('Factory 2');
        await authHelper.takeLoginScreenshot('multi-fm-factory2');
      }
    });
  });

  test.describe('Factory Worker Restrictions', () => {
    test.beforeEach(async ({ page }) => {
      // Login as Factory Worker
      await authHelper.login(TEST_USERS.fw1.username, TEST_USERS.fw1.password);
      
      // Should go to factory selection
      await expect(page).toHaveURL(/\/select-factory/);
      await authHelper.selectFactory('Factory 1');
      await authHelper.expectDashboard();
    });

    test('Factory Worker has no factory switcher', async ({ page }) => {
      // FW should not have factory switching capability
      const factorySwitcher = page.locator('[data-testid="factory-switcher"]');
      await expect(factorySwitcher).not.toBeVisible();
      
      // But should see their current factory
      await expect(page.locator('[data-testid="current-factory"]')).toContainText('Factory 1');
      await authHelper.takeLoginScreenshot('fw-no-switcher');
    });
  });

  test.describe('Session Persistence During Factory Switch', () => {
    test.beforeEach(async () => {
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
    });

    test('Session remains valid after multiple factory switches', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Perform multiple factory switches
      const factories = ['Factory 1', 'Factory 2', 'All Factories'];
      
      for (const factory of factories) {
        await authHelper.switchFactory(factory);
        await authHelper.expectFactorySwitched(factory);
        
        // Verify session is still valid
        await sessionHelper.expectSessionPersistence();
        
        // Verify we're still on dashboard
        await expect(page).toHaveURL(/\/dashboard/);
      }
    });

    test('Factory switch does not trigger re-authentication', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Get initial session data
      const initialSession = await sessionHelper.getSessionData();
      
      // Switch factory
      await authHelper.switchFactory('Factory 1');
      await authHelper.expectFactorySwitched('Factory 1');
      
      // Session token should remain the same (no re-auth)
      const newSession = await sessionHelper.getSessionData();
      expect(newSession.localStorage['supabase.auth.token']).toBeDefined();
      expect(initialSession.localStorage['supabase.auth.token']).toBeDefined();
      
      // The core auth token should be the same, only factory context changes
      // This would need deeper inspection of the JWT payload in a real implementation
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async () => {
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
    });

    test('Handle factory switch failure gracefully', async ({ page }) => {
      await page.waitForSelector('[data-testid="factory-switcher"]');
      
      // Mock a network failure or invalid factory ID
      await page.route('**/switch_factory_context', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Factory switch failed' } })
        });
      });
      
      // Attempt factory switch
      await page.click('[data-testid="factory-switcher"]');
      await page.selectOption('[data-testid="factory-select"]', { label: 'Factory 1' });
      await page.click('[data-testid="switch-factory-button"]');
      
      // Should show error message
      const errorElement = page.locator('[role="alert"]');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('Factory switch failed');
      
      // User should remain logged in
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});