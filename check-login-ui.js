import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Take a screenshot
  await page.screenshot({ 
    path: 'login-page-screenshot.png',
    fullPage: true 
  });
  console.log('Screenshot saved as login-page-screenshot.png');
  
  // Check for username field
  const usernameField = await page.$('#username');
  if (usernameField) {
    console.log('✓ Username field found');
  } else {
    console.log('✗ Username field NOT found');
  }
  
  // Check for password field
  const passwordField = await page.$('#password');
  if (passwordField) {
    console.log('✓ Password field found');
  } else {
    console.log('✗ Password field NOT found');
  }
  
  // Check for any embedded images
  const images = await page.$$('img');
  console.log(`Found ${images.length} embedded images`);
  
  // Check for SVG icons (acceptable)
  const svgs = await page.$$('svg');
  console.log(`Found ${svgs.length} SVG icons`);
  
  // Get the page title
  const title = await page.$eval('h1', el => el.textContent);
  console.log(`Page title: ${title}`);
  
  // Test form interaction
  if (usernameField) {
    await usernameField.type('testuser');
    console.log('✓ Can type in username field');
  }
  
  if (passwordField) {
    await passwordField.type('testpass123');
    console.log('✓ Can type in password field');
  }
  
  // Check submit button
  const submitButton = await page.$('button[type="submit"]');
  if (submitButton) {
    const buttonText = await submitButton.evaluate(el => el.textContent);
    console.log(`✓ Submit button found with text: "${buttonText}"`);
  }
  
  console.log('\nKeeping browser open for visual inspection...');
  console.log('Close the browser window when done reviewing.');
  
  // Wait for manual close
  await page.waitForSelector('thisWillNeverExist', { timeout: 0 }).catch(() => {});
})();