/**
 * CopperCore ERP - Authentication Flow E2E Tests
 * Tests complete authentication flows including login, factory selection, and logout
 */

import { test, expect } from '@playwright/test';
import { AuthPageHelpers, SessionHelpers, TEST_USERS, INVALID_CREDENTIALS, ERROR_MESSAGES } from '../utils/auth-helpers';

test.describe('Authentication Flow', () => {
  let authHelper: AuthPageHelpers;
  let sessionHelper: SessionHelpers;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthPageHelpers(page);
    sessionHelper = new SessionHelpers(page);
    
    // Clear any existing session
    await sessionHelper.clearSession();
    await page.goto('/');
  });

  test.describe('Successful Login Flows', () => {
    test('CEO login with valid credentials redirects to dashboard', async ({ page }) => {
      const { username, password } = TEST_USERS.ceo;
      
      // Navigate to login page
      await authHelper.goToLogin();
      await authHelper.takeLoginScreenshot('ceo-login-start');
      
      // Fill credentials and submit
      await authHelper.fillCredentials(username, password);
      await authHelper.takeLoginScreenshot('ceo-credentials-filled');
      
      await authHelper.submitLogin();
      
      // Expect successful login - CEO should go directly to dashboard or factory selection
      await authHelper.expectLoginSuccess();
      await authHelper.takeLoginScreenshot('ceo-login-success');
      
      // Verify we're authenticated
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(dashboard|select-factory)/);
    });

    test('Factory Manager login requires factory selection', async ({ page }) => {
      const { username, password } = TEST_USERS.fm1;
      
      await authHelper.login(username, password);
      
      // FM should be redirected to factory selection
      await expect(page).toHaveURL(/\/select-factory/);
      await authHelper.takeLoginScreenshot('fm-factory-selection');
      
      // Select a factory
      await page.waitForSelector('[data-testid="factory-select"]');
      await authHelper.selectFactory('Factory 1');
      
      // Should now redirect to dashboard
      await authHelper.expectDashboard();
      await authHelper.takeLoginScreenshot('fm-dashboard');
    });

    test('User can logout successfully', async ({ page }) => {
      // Login first
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
      
      // Logout
      await authHelper.logout();
      
      // Should be back at login page
      await expect(page).toHaveURL('/login');
      await authHelper.takeLoginScreenshot('logout-success');
      
      // Session should be cleared
      const sessionData = await sessionHelper.getSessionData();
      expect(sessionData.localStorage['supabase.auth.token']).toBeUndefined();
    });
  });

  test.describe('Failed Login Scenarios', () => {
    test('Login with wrong password shows error', async ({ page }) => {
      const { username, password } = INVALID_CREDENTIALS.wrongPassword;
      
      await authHelper.login(username, password);
      await authHelper.expectLoginError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      await authHelper.takeLoginScreenshot('wrong-password-error');
      
      // Should remain on login page
      await expect(page).toHaveURL('/login');
    });

    test('Login with non-existent user shows error', async ({ page }) => {
      const { username, password } = INVALID_CREDENTIALS.nonExistentUser;
      
      await authHelper.login(username, password);
      await authHelper.expectLoginError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      await authHelper.takeLoginScreenshot('nonexistent-user-error');
    });

    test('Empty username shows validation error', async ({ page }) => {
      await authHelper.goToLogin();
      await authHelper.fillCredentials('', 'password');
      await authHelper.submitLogin();
      
      await authHelper.expectValidationError('username', ERROR_MESSAGES.EMPTY_USERNAME);
      await authHelper.takeLoginScreenshot('empty-username-validation');
    });

    test('Empty password shows validation error', async ({ page }) => {
      await authHelper.goToLogin();
      await authHelper.fillCredentials('ceo', '');
      await authHelper.submitLogin();
      
      await authHelper.expectValidationError('password', ERROR_MESSAGES.EMPTY_PASSWORD);
      await authHelper.takeLoginScreenshot('empty-password-validation');
    });

    test('Short username shows validation error', async ({ page }) => {
      await authHelper.goToLogin();
      await authHelper.fillCredentials('x', 'password');
      await authHelper.submitLogin();
      
      await authHelper.expectValidationError('username', ERROR_MESSAGES.SHORT_USERNAME);
      await authHelper.takeLoginScreenshot('short-username-validation');
    });

    test('Invalid username format shows validation error', async ({ page }) => {
      await authHelper.goToLogin();
      await authHelper.fillCredentials('user@domain.com', 'password');
      await authHelper.submitLogin();
      
      await authHelper.expectValidationError('username', ERROR_MESSAGES.INVALID_FORMAT);
      await authHelper.takeLoginScreenshot('invalid-format-validation');
    });
  });

  test.describe('UI State Management', () => {
    test('Login button shows loading state during authentication', async ({ page }) => {
      await authHelper.goToLogin();
      await authHelper.fillCredentials(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      
      // Click submit and immediately check for loading state
      const loginButton = page.locator('[data-testid="login-button"]');
      await loginButton.click();
      
      // Button should show loading state
      await expect(loginButton).toContainText('Signing in...');
      await expect(loginButton).toBeDisabled();
      
      // Wait for completion
      await authHelper.expectLoginSuccess();
    });

    test('Error messages clear when user starts typing', async ({ page }) => {
      // Trigger an error first
      await authHelper.login('', '');
      await authHelper.expectValidationError('username', ERROR_MESSAGES.EMPTY_USERNAME);
      
      // Start typing in username field
      await page.fill('[data-testid="username-input"]', 'c');
      
      // Error should be cleared
      const errorElement = page.locator('#username-error');
      await expect(errorElement).not.toBeVisible();
    });

    test('Form fields have proper accessibility attributes', async ({ page }) => {
      await authHelper.goToLogin();
      
      const usernameInput = page.locator('[data-testid="username-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      
      // Check ARIA attributes
      await expect(usernameInput).toHaveAttribute('autoComplete', 'username');
      await expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      
      // Check labels are properly associated
      await expect(page.locator('label[for="username"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
    });
  });

  test.describe('Route Protection', () => {
    test('Dashboard route redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });

    test('Factory selection route redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/select-factory');
      await expect(page).toHaveURL('/login');
    });

    test('Authenticated user redirected from login to dashboard', async ({ page }) => {
      // Login first
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
      
      // Try to go back to login page
      await page.goto('/login');
      
      // Should be redirected to dashboard or factory selection
      await expect(page).toHaveURL(/\/(dashboard|select-factory)/);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('Login form works consistently across browsers', async ({ page }) => {
      await authHelper.goToLogin();
      
      // Verify form elements are properly rendered
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      
      // Test form submission
      await authHelper.login(TEST_USERS.ceo.username, TEST_USERS.ceo.password);
      await authHelper.expectLoginSuccess();
    });
  });
});