const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

(async () => {
  let browser;
  let page;
  
  try {
    console.log('🚀 Starting CopperCore Button Test Suite...\n');
    
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Create screenshots directory
    const screenshotsDir = '/Users/ibrahimkashif/Desktop/CopperCore/screenshots';
    try {
      await fs.mkdir(screenshotsDir, { recursive: true });
    } catch (e) {
      // Directory already exists
    }
    
    console.log('✅ Browser launched successfully');
    
    // Step 1: Navigate to the application
    console.log('🌐 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-initial-page.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: 01-initial-page.png');
    
    // Check if we're already authenticated or need to log in
    const isLoginPage = await page.$('form[data-testid="login-form"]') || 
                       await page.$('input[type="email"]') || 
                       await page.$('input[placeholder*="email"]') ||
                       await page.$('button:contains("Sign In")') ||
                       await page.$('button:contains("Log In")') ||
                       await page.$('button:contains("Login")');
    
    if (isLoginPage) {
      console.log('🔐 Login page detected. Attempting to authenticate...');
      
      // Try to find and fill email/username field
      const emailField = await page.$('input[type="email"]') || 
                         await page.$('input[placeholder*="email"]') ||
                         await page.$('input[name="email"]') ||
                         await page.$('input[name="username"]');
      
      if (emailField) {
        await emailField.type('admin@coppercore.com'); // Using a CEO-level user
        console.log('✅ Email field filled');
      }
      
      // Try to find and fill password field
      const passwordField = await page.$('input[type="password"]') ||
                           await page.$('input[name="password"]');
      
      if (passwordField) {
        await passwordField.type('admin123'); // Common admin password
        console.log('✅ Password field filled');
      }
      
      // Take screenshot of filled login form
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-login-form-filled.png'),
        fullPage: true 
      });
      console.log('📷 Screenshot saved: 02-login-form-filled.png');
      
      // Try to find and click login/submit button
      const submitButton = await page.$('button[type="submit"]') ||
                          await page.$('button:contains("Sign In")') ||
                          await page.$('button:contains("Log In")') ||
                          await page.$('button:contains("Login")') ||
                          await page.$('input[type="submit"]');
      
      if (submitButton) {
        await submitButton.click();
        console.log('🔘 Login button clicked');
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
    } else {
      console.log('ℹ️ No login page detected - checking if already authenticated');
    }
    
    // Take screenshot after potential login
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-after-login.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: 03-after-login.png');
    
    // Step 2: Navigate to Manage Company
    console.log('🏢 Looking for Manage Company section...');
    
    // Wait for page to load and look for Manage Company link/button
    await page.waitForTimeout(2000);
    
    // Try different selectors for Manage Company navigation
    let manageCompanyLink = await page.$('a[href*="manage"]') ||
                           await page.$('a:contains("Manage Company")') ||
                           await page.$('button:contains("Manage Company")') ||
                           await page.$('[data-testid="manage-company"]');
    
    if (manageCompanyLink) {
      await manageCompanyLink.click();
      console.log('🔘 Manage Company link clicked');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    } else {
      // Try to navigate directly to manage company route
      console.log('🔍 Direct navigation to /manage-company...');
      await page.goto('http://localhost:3000/manage-company', { waitUntil: 'networkidle0' });
    }
    
    // Take screenshot of Manage Company page
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-manage-company-page.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: 04-manage-company-page.png');
    
    // Step 3: Test Factories Tab
    console.log('🏭 Testing Factories Tab...');
    
    // Look for Factories tab
    const factoriesTab = await page.$('button:contains("Factories")') ||
                        await page.$('[data-testid="factories-tab"]') ||
                        await page.$('nav button:first-child'); // Often the first tab
    
    if (factoriesTab) {
      await factoriesTab.click();
      console.log('🔘 Factories tab clicked');
      await page.waitForTimeout(1000);
      
      // Take screenshot of Factories tab
      await page.screenshot({ 
        path: path.join(screenshotsDir, '05-factories-tab.png'),
        fullPage: true 
      });
      console.log('📷 Screenshot saved: 05-factories-tab.png');
      
      // Look for Add Factory / Create Factory button
      console.log('🔍 Looking for Create Factory button...');
      const createFactoryButton = await page.$('button:contains("Add Factory")') ||
                                 await page.$('button:contains("Create Factory")') ||
                                 await page.$('[data-testid="create-factory"]') ||
                                 await page.$('button[class*="copper"]');
      
      if (createFactoryButton) {
        console.log('✅ Create Factory button found!');
        
        // Test button responsiveness
        const beforeClick = await page.evaluate(() => document.body.innerHTML.length);
        
        await createFactoryButton.click();
        console.log('🔘 Create Factory button clicked');
        
        await page.waitForTimeout(2000); // Wait for any modal or form to appear
        
        const afterClick = await page.evaluate(() => document.body.innerHTML.length);
        
        // Take screenshot after clicking Create Factory
        await page.screenshot({ 
          path: path.join(screenshotsDir, '06-create-factory-clicked.png'),
          fullPage: true 
        });
        console.log('📷 Screenshot saved: 06-create-factory-clicked.png');
        
        // Check if modal or form appeared
        const modal = await page.$('[role="dialog"]') || 
                     await page.$('.modal') ||
                     await page.$('form') ||
                     await page.$('[data-testid*="form"]');
        
        if (modal || afterClick > beforeClick) {
          console.log('✅ CREATE FACTORY BUTTON IS WORKING! Modal/form appeared.');
          
          // Try to find and click Cancel button if it exists
          const cancelButton = await page.$('button:contains("Cancel")') ||
                              await page.$('[data-testid="cancel"]');
          
          if (cancelButton) {
            await cancelButton.click();
            console.log('🔘 Cancel button clicked (as expected to work)');
            await page.waitForTimeout(1000);
            
            // Take screenshot after cancel
            await page.screenshot({ 
              path: path.join(screenshotsDir, '07-factory-form-cancelled.png'),
              fullPage: true 
            });
            console.log('📷 Screenshot saved: 07-factory-form-cancelled.png');
          }
        } else {
          console.log('❌ CREATE FACTORY BUTTON NOT RESPONDING - No modal or form appeared');
        }
      } else {
        console.log('❌ Create Factory button not found');
      }
    } else {
      console.log('❌ Factories tab not found');
    }
    
    // Step 4: Test Users Tab  
    console.log('👥 Testing Users Tab...');
    
    // Look for Users tab
    const usersTab = await page.$('button:contains("Users")') ||
                    await page.$('[data-testid="users-tab"]') ||
                    await page.$('nav button:nth-child(2)'); // Often the second tab
    
    if (usersTab) {
      await usersTab.click();
      console.log('🔘 Users tab clicked');
      await page.waitForTimeout(1000);
      
      // Take screenshot of Users tab
      await page.screenshot({ 
        path: path.join(screenshotsDir, '08-users-tab.png'),
        fullPage: true 
      });
      console.log('📷 Screenshot saved: 08-users-tab.png');
      
      // Look for Add User / Create User button
      console.log('🔍 Looking for Create User button...');
      const createUserButton = await page.$('button:contains("Add User")') ||
                              await page.$('button:contains("Create User")') ||
                              await page.$('[data-testid="create-user"]') ||
                              await page.$('button[class*="copper"]');
      
      if (createUserButton) {
        console.log('✅ Create User button found!');
        
        // Test button responsiveness
        const beforeClick = await page.evaluate(() => document.body.innerHTML.length);
        
        await createUserButton.click();
        console.log('🔘 Create User button clicked');
        
        await page.waitForTimeout(2000); // Wait for any modal or form to appear
        
        const afterClick = await page.evaluate(() => document.body.innerHTML.length);
        
        // Take screenshot after clicking Create User
        await page.screenshot({ 
          path: path.join(screenshotsDir, '09-create-user-clicked.png'),
          fullPage: true 
        });
        console.log('📷 Screenshot saved: 09-create-user-clicked.png');
        
        // Check if modal or form appeared
        const modal = await page.$('[role="dialog"]') || 
                     await page.$('.modal') ||
                     await page.$('form') ||
                     await page.$('[data-testid*="form"]');
        
        if (modal || afterClick > beforeClick) {
          console.log('✅ CREATE USER BUTTON IS WORKING! Modal/form appeared.');
          
          // Try to find and click Cancel button if it exists
          const cancelButton = await page.$('button:contains("Cancel")') ||
                              await page.$('[data-testid="cancel"]');
          
          if (cancelButton) {
            await cancelButton.click();
            console.log('🔘 Cancel button clicked (as expected to work)');
            await page.waitForTimeout(1000);
            
            // Take screenshot after cancel
            await page.screenshot({ 
              path: path.join(screenshotsDir, '10-user-form-cancelled.png'),
              fullPage: true 
            });
            console.log('📷 Screenshot saved: 10-user-form-cancelled.png');
          }
        } else {
          console.log('❌ CREATE USER BUTTON NOT RESPONDING - No modal or form appeared');
        }
      } else {
        console.log('❌ Create User button not found');
      }
    } else {
      console.log('❌ Users tab not found');
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '11-final-state.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: 11-final-state.png');
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (page) {
      // Take error screenshot
      try {
        const screenshotsDir = '/Users/ibrahimkashif/Desktop/CopperCore/screenshots';
        await page.screenshot({ 
          path: path.join(screenshotsDir, 'error-screenshot.png'),
          fullPage: true 
        });
        console.log('📷 Error screenshot saved: error-screenshot.png');
      } catch (e) {
        console.log('Could not save error screenshot');
      }
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 Browser closed');
    }
  }
})();