/**
 * CopperCore ERP - Auth Test Helpers
 * Utilities for authentication testing across unit, integration, and E2E tests
 */

import { Page, expect } from '@playwright/test';

// Test user credentials
export const TEST_USERS = {
  ceo: { username: 'ceo', password: 'admin123', role: 'CEO' },
  director: { username: 'director', password: 'dir123456', role: 'Director' },
  fm1: { username: 'fm1', password: 'fm123456', role: 'FM' },
  fw1: { username: 'fw1', password: 'fw123456', role: 'FW' },
  office2: { username: 'office2', password: 'office123', role: 'Office' },
  fm_multi: { username: 'fm_multi', password: 'multi123', role: 'FM' }
} as const;

export const INVALID_CREDENTIALS = {
  wrongPassword: { username: 'ceo', password: 'wrongpass' },
  nonExistentUser: { username: 'fakeuser', password: 'any' },
  emptyUsername: { username: '', password: 'admin123' },
  emptyPassword: { username: 'ceo', password: '' },
  shortUsername: { username: 'x', password: 'admin123' },
  invalidChars: { username: 'user@domain', password: 'admin123' }
} as const;

// Case sensitivity test variations
export const USERNAME_CASE_VARIATIONS = [
  'ceo', 'CEO', 'CeO', 'cEo', 'Ceo', 'cEO', 'CEo', 'ceO'
] as const;

/**
 * Playwright E2E helpers
 */
export class AuthPageHelpers {
  constructor(private page: Page) {}

  async goToLogin() {
    await this.page.goto('/login');
    await this.page.waitForSelector('[data-testid="username-input"]');
  }

  async fillCredentials(username: string, password: string) {
    await this.page.fill('[data-testid="username-input"]', username);
    await this.page.fill('[data-testid="password-input"]', password);
  }

  async submitLogin() {
    await this.page.click('[data-testid="login-button"]');
  }

  async login(username: string, password: string) {
    await this.goToLogin();
    await this.fillCredentials(username, password);
    await this.submitLogin();
  }

  async expectLoginSuccess() {
    // Should redirect to factory selection or dashboard
    await expect(this.page).toHaveURL(/\/(select-factory|dashboard)/);
  }

  async expectLoginError(expectedError: string) {
    const errorElement = this.page.locator('[role="alert"]').first();
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(expectedError);
  }

  async expectValidationError(field: 'username' | 'password', expectedError: string) {
    const errorElement = this.page.locator(`#${field}-error`);
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(expectedError);
  }

  async selectFactory(factoryName: string) {
    await this.page.selectOption('[data-testid="factory-select"]', { label: factoryName });
    await this.page.click('[data-testid="select-factory-button"]');
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await this.page.waitForSelector('[data-testid="user-menu"]');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL('/login');
  }

  async switchFactory(factoryName: string) {
    await this.page.click('[data-testid="factory-switcher"]');
    await this.page.selectOption('[data-testid="factory-select"]', { label: factoryName });
    await this.page.click('[data-testid="switch-factory-button"]');
  }

  async expectFactorySwitched(factoryName: string) {
    const factoryIndicator = this.page.locator('[data-testid="current-factory"]');
    await expect(factoryIndicator).toContainText(factoryName);
  }

  async takeLoginScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/login-${name}.png`,
      fullPage: true 
    });
  }
}

/**
 * Session storage helpers for E2E tests
 */
export class SessionHelpers {
  constructor(private page: Page) {}

  async clearSession() {
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // In some contexts (like file:// protocol), localStorage might not be accessible
      // Continue with the test as this is not critical for most test scenarios
      console.warn('Could not clear localStorage/sessionStorage:', error);
    }
  }

  async getSessionData() {
    return await this.page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      };
    });
  }

  async setAuthSession(sessionData: any) {
    await this.page.evaluate((data) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data));
    }, sessionData);
  }

  async expectSessionPersistence() {
    const session = await this.getSessionData();
    expect(session.localStorage['supabase.auth.token']).toBeDefined();
  }

  async refreshPage() {
    await this.page.reload({ waitUntil: 'networkidle' });
  }
}

/**
 * JWT utilities for testing
 */
export function createTestJWT(claims: Record<string, any>) {
  const header = { typ: 'JWT', alg: 'HS256' };
  const payload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://test.supabase.co/auth/v1',
    sub: claims.user_id || 'test-user-id',
    ...claims
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  return `${encodedHeader}.${encodedPayload}.test-signature`;
}

/**
 * Database test helpers
 */
export async function waitForDatabaseReady() {
  // In a real implementation, this would check if the database is ready
  // For now, we'll just wait a bit to ensure migrations are applied
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Error message assertions
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  EMPTY_USERNAME: 'Username is required',
  EMPTY_PASSWORD: 'Password is required',
  SHORT_USERNAME: 'Username must be at least 2 characters',
  INVALID_FORMAT: 'Username can only contain letters, numbers, underscore, and hyphen',
  ACCOUNT_DISABLED: 'User account is disabled',
  ACCESS_DENIED: 'Access denied to factory'
} as const;