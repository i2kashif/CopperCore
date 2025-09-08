/**
 * CopperCore ERP - Playwright Global Setup
 * Setup for E2E tests including database seeding and authentication state
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright E2E tests...');
  
  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  try {
    // Launch browser to verify app is running
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔍 Checking if development server is running...');
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if login page loads correctly
    await page.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
    console.log('✅ Development server is running and responsive');
    
    // Optionally verify database connectivity
    // We could add a health check endpoint later
    
    await browser.close();
    
    console.log('🎭 Playwright setup complete');
    
  } catch (error) {
    console.error('❌ Playwright setup failed:', error);
    throw error;
  }
}

export default globalSetup;