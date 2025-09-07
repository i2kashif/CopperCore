import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to login page on port 3002...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
  
  // Wait a bit for everything to render
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Take screenshot
  await page.screenshot({ 
    path: 'ui-check-now.png',
    fullPage: true 
  });
  console.log('Screenshot saved as ui-check-now.png');
  
  // Check what's actually on the page
  const pageContent = await page.evaluate(() => {
    return {
      title: document.querySelector('h1')?.textContent || 'No h1 found',
      hasUsername: !!document.querySelector('#username'),
      hasPassword: !!document.querySelector('#password'),
      hasButton: !!document.querySelector('button[type="submit"]'),
      bodyText: document.body.innerText.substring(0, 500)
    };
  });
  
  console.log('Page content:', pageContent);
  
  // Keep browser open for inspection
  console.log('\nBrowser is open for inspection. Close it when done.');
})();