/* eslint-env node */
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Taking before screenshot...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'login-after-full.png',
    fullPage: true 
  });
  
  // Take focused card screenshot
  await page.setViewport({ width: 1280, height: 800 });
  await page.screenshot({ 
    path: 'login-after-desktop.png'
  });
  
  // Mobile view
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ 
    path: 'login-after-mobile.png'
  });
  
  // Test interaction states
  await page.setViewport({ width: 1280, height: 800 });
  
  // Focus state
  await page.focus('#username');
  await page.screenshot({ 
    path: 'login-focus-state.png'
  });
  
  // Error state
  await page.click('button[type="submit"]');
  await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  await page.screenshot({ 
    path: 'login-error-state.png'
  });
  
  console.log('Screenshots saved!');
  console.log('- login-after-full.png (full page)');
  console.log('- login-after-desktop.png (desktop view)');
  console.log('- login-after-mobile.png (mobile view)');
  console.log('- login-focus-state.png (focus rings)');
  console.log('- login-error-state.png (validation error)');
  
  await browser.close();
})();
