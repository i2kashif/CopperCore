import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
  
  // Take screenshot of copper-themed UI
  await page.screenshot({ 
    path: 'copper-ui.png',
    fullPage: true 
  });
  console.log('Screenshot saved as copper-ui.png');
  
  // Test login with CEO credentials
  console.log('\nTesting login with CEO credentials...');
  
  // Type username
  await page.type('#username', 'ceo');
  console.log('✓ Entered username: ceo');
  
  // Type password
  await page.type('#password', 'admin123');
  console.log('✓ Entered password: admin123');
  
  // Click sign in
  await page.click('button[type="submit"]');
  console.log('✓ Clicked Sign In button');
  
  // Wait for navigation or error
  await page.waitForTimeout(2000);
  
  // Check if we're still on login page (error) or navigated
  const url = page.url();
  const hasError = await page.$('[role="alert"]');
  
  if (hasError) {
    const errorText = await page.$eval('[role="alert"]', el => el.textContent);
    console.log('✗ Login failed with error:', errorText);
  } else if (url !== 'http://localhost:3002/') {
    console.log('✓ Login successful! Redirected to:', url);
  } else {
    // Check if we're logged in by looking for dashboard elements
    const pageContent = await page.evaluate(() => document.body.innerText);
    console.log('Page content after login:', pageContent.substring(0, 200));
  }
  
  console.log('\nBrowser window is open for inspection.');
})();