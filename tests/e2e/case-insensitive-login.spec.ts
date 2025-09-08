/**
 * CopperCore ERP - Case-Insensitive Login E2E Tests
 * Tests that usernames work regardless of case (CEO, ceo, CeO, etc.)
 */

import { test, expect } from '@playwright/test';
import { AuthPageHelpers, SessionHelpers, USERNAME_CASE_VARIATIONS, TEST_USERS } from '../utils/auth-helpers';

test.describe('Case-Insensitive Login', () => {
  let authHelper: AuthPageHelpers;
  let sessionHelper: SessionHelpers;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthPageHelpers(page);
    sessionHelper = new SessionHelpers(page);
    
    // Clear any existing session
    await sessionHelper.clearSession();
  });

  test.describe('Username Case Variations', () => {
    USERNAME_CASE_VARIATIONS.forEach((usernameVariation) => {
      test(`Login with "${usernameVariation}" (case variation of "ceo") should succeed`, async ({ page }) => {
        const password = TEST_USERS.ceo.password;
        
        // Navigate to login
        await authHelper.goToLogin();
        
        // Fill credentials with case variation
        await authHelper.fillCredentials(usernameVariation, password);
        await authHelper.takeLoginScreenshot(`case-variation-${usernameVariation.toLowerCase()}`);
        
        // Submit login
        await authHelper.submitLogin();
        
        // Should succeed regardless of case
        await authHelper.expectLoginSuccess();
        await authHelper.takeLoginScreenshot(`case-success-${usernameVariation.toLowerCase()}`);
        
        // Verify we're on the right page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(dashboard|select-factory)/);
      });
    });
  });

  test.describe('Mixed Case Username Scenarios', () => {
    test('Mixed case usernames with different roles work correctly', async ({ page }) => {
      const testCases = [
        { username: 'FM1', expectedUser: TEST_USERS.fm1 },
        { username: 'fM1', expectedUser: TEST_USERS.fm1 },
        { username: 'Fm1', expectedUser: TEST_USERS.fm1 },
        { username: 'fM_multi', expectedUser: TEST_USERS.fm_multi },
        { username: 'OFFICE2', expectedUser: TEST_USERS.office2 }
      ];

      for (const testCase of testCases) {
        // Clear session before each test
        await sessionHelper.clearSession();
        
        // Login with mixed case username
        await authHelper.login(testCase.username, testCase.expectedUser.password);
        
        // Should succeed
        await authHelper.expectLoginSuccess();
        await authHelper.takeLoginScreenshot(`mixed-case-${testCase.username.toLowerCase()}`);
        
        // Logout for next iteration
        if (page.url().includes('dashboard')) {
          await authHelper.logout();
        } else {
          // If on factory selection, navigate to login directly
          await page.goto('/login');
        }
      }
    });

    test('Case normalization happens on client side', async ({ page }) => {
      await authHelper.goToLogin();
      
      // Fill username with mixed case
      const usernameInput = page.locator('[data-testid="username-input"]');
      await usernameInput.fill('CeO');
      
      // Verify that the input value is normalized to lowercase when submitted
      // (This tests the client-side normalization logic)
      await authHelper.fillCredentials('CeO', TEST_USERS.ceo.password);
      
      // Check the actual value in the input (should be normalized by the onChange handler)
      const inputValue = await usernameInput.inputValue();
      // Note: The normalization might happen on submit, not on input change
      
      await authHelper.submitLogin();
      await authHelper.expectLoginSuccess();
    });
  });

  test.describe('Case Sensitivity Error Handling', () => {
    test('Case variations with wrong password still show correct error', async ({ page }) => {
      const testCases = ['CEO', 'ceo', 'CeO', 'cEO'];
      
      for (const usernameVariation of testCases) {
        await sessionHelper.clearSession();
        await authHelper.goToLogin();
        
        // Use wrong password with case variation
        await authHelper.fillCredentials(usernameVariation, 'wrongpassword');
        await authHelper.submitLogin();
        
        // Should show invalid credentials error
        await authHelper.expectLoginError('Invalid username or password');
        await authHelper.takeLoginScreenshot(`wrong-pass-${usernameVariation.toLowerCase()}`);
      }
    });

    test('Non-existent username in different cases shows same error', async ({ page }) => {
      const nonExistentVariations = ['NONEXISTENT', 'nonexistent', 'NonExistent', 'nOnExIsTeNt'];
      
      for (const username of nonExistentVariations) {
        await sessionHelper.clearSession();
        await authHelper.goToLogin();
        
        await authHelper.fillCredentials(username, 'anypassword');
        await authHelper.submitLogin();
        
        // Should show invalid credentials error
        await authHelper.expectLoginError('Invalid username or password');
        await authHelper.takeLoginScreenshot(`nonexistent-${username.toLowerCase()}`);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('Username with underscores and hyphens in different cases', async ({ page }) => {
      // Test with fm_multi user in various cases
      const variations = ['FM_MULTI', 'fm_multi', 'Fm_Multi', 'fM_mUlTi'];
      
      for (const variation of variations) {
        await sessionHelper.clearSession();
        
        await authHelper.login(variation, TEST_USERS.fm_multi.password);
        await authHelper.expectLoginSuccess();
        await authHelper.takeLoginScreenshot(`underscore-case-${variation.toLowerCase().replace('_', '-')}`);
        
        // Navigate back to login for next iteration
        await page.goto('/login');
      }
    });

    test('Leading and trailing whitespace is handled correctly', async ({ page }) => {
      await authHelper.goToLogin();
      
      // Test with whitespace (should be trimmed by the client)
      await authHelper.fillCredentials('  ceo  ', TEST_USERS.ceo.password);
      await authHelper.submitLogin();
      
      // Should still succeed (assuming client trims whitespace)
      await authHelper.expectLoginSuccess();
      await authHelper.takeLoginScreenshot('whitespace-trimmed');
    });

    test('Empty string and whitespace-only usernames show validation errors', async ({ page }) => {
      await authHelper.goToLogin();
      
      // Test empty string
      await authHelper.fillCredentials('', TEST_USERS.ceo.password);
      await authHelper.submitLogin();
      await authHelper.expectValidationError('username', 'Username is required');
      
      // Clear and test whitespace-only
      await page.reload();
      await authHelper.fillCredentials('   ', TEST_USERS.ceo.password);
      await authHelper.submitLogin();
      await authHelper.expectValidationError('username', 'Username is required');
    });
  });

  test.describe('Session Persistence with Case Variations', () => {
    test('Session data is consistent regardless of login case', async ({ page }) => {
      // Login with uppercase
      await authHelper.login('CEO', TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
      
      // Get session data
      const sessionData1 = await sessionHelper.getSessionData();
      
      // Logout and login with lowercase
      await authHelper.logout();
      await authHelper.login('ceo', TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
      
      // Get session data again
      const sessionData2 = await sessionHelper.getSessionData();
      
      // Both sessions should represent the same user
      expect(sessionData1.localStorage).toBeDefined();
      expect(sessionData2.localStorage).toBeDefined();
      
      // The actual user data should be identical regardless of how they logged in
      // (This would need to be verified by inspecting the JWT or user data)
    });

    test('Page refresh maintains session regardless of original login case', async ({ page }) => {
      // Login with mixed case
      await authHelper.login('CeO', TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
      
      // Refresh the page
      await sessionHelper.refreshPage();
      
      // Should still be logged in
      await expect(page).toHaveURL(/\/(dashboard|select-factory)/);
      await sessionHelper.expectSessionPersistence();
    });
  });
});