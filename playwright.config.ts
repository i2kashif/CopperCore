import { defineConfig, devices } from '@playwright/test';

/**
 * CopperCore ERP - Playwright Configuration
 * E2E testing configuration for authentication and UI flows
 */

export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['junit', { outputFile: 'test-results/junit-e2e.xml' }]
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Browser context options */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* Custom headers for CopperCore */
    extraHTTPHeaders: {
      'X-Test-Client': 'playwright-e2e'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Folder for test artifacts */
  outputDir: 'test-results/',
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Ensure test environment variables are loaded
      NODE_ENV: 'test'
    }
  },
  
  /* Global setup and teardown */
  globalSetup: './tests/playwright-setup.ts',
  
  /* Test timeout */
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  
  /* Test match patterns */
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/acceptance/**/*.spec.ts'
  ]
});