import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Taking screenshot...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
  
  await page.screenshot({ 
    path: 'login-ui-fixed.png',
    fullPage: true 
  });
  
  console.log('Screenshot saved as login-ui-fixed.png');
  await browser.close();
})();