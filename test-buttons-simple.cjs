/* eslint-env node, browser */
/* eslint-disable @typescript-eslint/no-var-requires, no-undef, max-lines-per-function, complexity, max-depth */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

(async () => {
  let browser;
  let page;
  
  try {
    console.log('🚀 Starting CopperCore Button Test Suite (Simplified)...\n');
    
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to false to see the browser
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: false
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
      path: path.join(screenshotsDir, 'simple-01-initial-page.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: simple-01-initial-page.png');
    
    // Step 2: Try multiple authentication approaches
    console.log('🔐 Attempting authentication...');
    
    // Look for the correct form elements using data-testid and name attributes
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });
    
    // Try different username/password combinations that might exist
    const credentials = [
      { username: 'admin', password: 'admin' },
      { username: 'ceo', password: 'password' },
      { username: 'director', password: 'password' },
      { username: 'test', password: 'test' },
      { username: 'demo', password: 'demo' }
    ];
    
    let authSuccessful = false;
    
    for (const cred of credentials) {
      console.log(`🔑 Trying credentials: ${cred.username}/${cred.password}`);
      
      // Clear and fill username field
      const usernameField = await page.$('input[name="username"]');
      if (usernameField) {
        await usernameField.click({ clickCount: 3 }); // Select all
        await usernameField.type(cred.username);
      }
      
      // Clear and fill password field  
      const passwordField = await page.$('input[name="password"]');
      if (passwordField) {
        await passwordField.click({ clickCount: 3 }); // Select all
        await passwordField.type(cred.password);
      }
      
      // Submit the form
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait a bit to see if login succeeds
        try {
          // Wait for either navigation away from login or for an error to appear
          await page.waitForFunction(() => {
            return !window.location.pathname.includes('login') || 
                   window.location.pathname !== '/' ||
                   document.querySelector('[data-testid="login-form"]') === null;
          }, { timeout: 5000 });
          
          // Check if we're no longer on the login page
          const currentUrl = page.url();
          if (!currentUrl.includes('login') && currentUrl !== 'http://localhost:3000/') {
            console.log(`✅ Authentication successful with ${cred.username}!`);
            authSuccessful = true;
            break;
          }
        } catch (e) {
          console.log(`❌ Login failed for ${cred.username}/${cred.password}`);
        }
      }
      
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot after login attempts
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'simple-02-after-login.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: simple-02-after-login.png');
    
    // Step 3: If login didn't work, try direct navigation to manage company
    if (!authSuccessful) {
      console.log('⚠️ Authentication failed, trying direct navigation...');
      
      try {
        await page.goto('http://localhost:3000/manage-company', { waitUntil: 'networkidle0', timeout: 10000 });
        console.log('🔄 Direct navigation attempted');
      } catch (e) {
        console.log('⚠️ Direct navigation also failed, continuing with current state...');
      }
    }
    
    // Step 4: Look for the Manage Company interface regardless of auth state
    await page.waitForTimeout(3000);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'simple-03-current-state.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: simple-03-current-state.png');
    
    // Step 5: Look for tab navigation and buttons
    console.log('🔍 Searching for Manage Company elements...');
    
    // Look for tab navigation
    let factoriesTab = await page.$('button:has-text("Factories")') ||
                      await page.$('button[aria-label*="Factories"]') ||
                      await page.$('[role="tab"]:has-text("Factories")');
    
    let usersTab = await page.$('button:has-text("Users")') ||
                  await page.$('button[aria-label*="Users"]') ||
                  await page.$('[role="tab"]:has-text("Users")');
    
    // If we can't find tabs by text, try generic selectors
    if (!factoriesTab) {
      const allButtons = await page.$$('button');
      console.log(`📊 Found ${allButtons.length} buttons on page`);
      
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase(), button);
        if (text?.includes('factories') || text?.includes('factory')) {
          factoriesTab = button;
          console.log('✅ Found Factories tab');
          break;
        }
      }
    }
    
    if (!usersTab) {
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase(), button);
        if (text?.includes('users') || text?.includes('user')) {
          usersTab = button;
          console.log('✅ Found Users tab');
          break;
        }
      }
    }
    
    // Test Results Object
    const testResults = {
      authenticationWorked: authSuccessful,
      factoriesTabFound: !!factoriesTab,
      usersTabFound: !!usersTab,
      createFactoryButtonTest: { found: false, responsive: false },
      createUserButtonTest: { found: false, responsive: false }
    };
    
    // Step 6: Test Factories Tab and Create Factory Button
    if (factoriesTab) {
      console.log('🏭 Testing Factories tab...');
      await factoriesTab.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of factories tab
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'simple-04-factories-tab.png'),
        fullPage: true 
      });
      console.log('📷 Screenshot saved: simple-04-factories-tab.png');
      
      // Look for Create Factory button
      const createFactoryButton = await page.$('button:has-text("Add Factory")') ||
                                 await page.$('button:has-text("Create Factory")') ||
                                 await page.$('button:has-text("New Factory")');
      
      if (createFactoryButton) {
        console.log('✅ Create Factory button found!');
        testResults.createFactoryButtonTest.found = true;
        
        // Test button click
        try {
          const beforeClick = await page.content();
          await createFactoryButton.click();
          await page.waitForTimeout(2000);
          const afterClick = await page.content();
          
          // Take screenshot after clicking
          await page.screenshot({ 
            path: path.join(screenshotsDir, 'simple-05-factory-button-clicked.png'),
            fullPage: true 
          });
          console.log('📷 Screenshot saved: simple-05-factory-button-clicked.png');
          
          // Check if content changed (form appeared)
          if (beforeClick !== afterClick) {
            console.log('✅ CREATE FACTORY BUTTON IS RESPONSIVE! Content changed after click.');
            testResults.createFactoryButtonTest.responsive = true;
            
            // Look for cancel button and click it
            const cancelButton = await page.$('button:has-text("Cancel")');
            if (cancelButton) {
              await cancelButton.click();
              console.log('✅ Cancel button works');
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('❌ CREATE FACTORY BUTTON NOT RESPONSIVE - No content change detected');
          }
        } catch (e) {
          console.log('❌ Error testing Create Factory button:', e.message);
        }
      } else {
        console.log('❌ Create Factory button not found');
      }
    }
    
    // Step 7: Test Users Tab and Create User Button  
    if (usersTab) {
      console.log('👥 Testing Users tab...');
      await usersTab.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of users tab
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'simple-06-users-tab.png'),
        fullPage: true 
      });
      console.log('📷 Screenshot saved: simple-06-users-tab.png');
      
      // Look for Create User button
      const createUserButton = await page.$('button:has-text("Add User")') ||
                              await page.$('button:has-text("Create User")') ||
                              await page.$('button:has-text("New User")');
      
      if (createUserButton) {
        console.log('✅ Create User button found!');
        testResults.createUserButtonTest.found = true;
        
        // Test button click
        try {
          const beforeClick = await page.content();
          await createUserButton.click();
          await page.waitForTimeout(2000);
          const afterClick = await page.content();
          
          // Take screenshot after clicking
          await page.screenshot({ 
            path: path.join(screenshotsDir, 'simple-07-user-button-clicked.png'),
            fullPage: true 
          });
          console.log('📷 Screenshot saved: simple-07-user-button-clicked.png');
          
          // Check if content changed (form appeared)
          if (beforeClick !== afterClick) {
            console.log('✅ CREATE USER BUTTON IS RESPONSIVE! Content changed after click.');
            testResults.createUserButtonTest.responsive = true;
            
            // Look for cancel button and click it
            const cancelButton = await page.$('button:has-text("Cancel")');
            if (cancelButton) {
              await cancelButton.click();
              console.log('✅ Cancel button works');
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('❌ CREATE USER BUTTON NOT RESPONSIVE - No content change detected');
          }
        } catch (e) {
          console.log('❌ Error testing Create User button:', e.message);
        }
      } else {
        console.log('❌ Create User button not found');
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'simple-08-final-state.png'),
      fullPage: true 
    });
    console.log('📷 Screenshot saved: simple-08-final-state.png');
    
    // Print test results
    console.log('\n📋 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log(`🔐 Authentication: ${testResults.authenticationWorked ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🏭 Factories Tab: ${testResults.factoriesTabFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`👥 Users Tab: ${testResults.usersTabFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`🏭 Create Factory Button: ${testResults.createFactoryButtonTest.found ? '✅ FOUND' : '❌ NOT FOUND'} | ${testResults.createFactoryButtonTest.responsive ? '✅ RESPONSIVE' : '❌ NOT RESPONSIVE'}`);
    console.log(`👥 Create User Button: ${testResults.createUserButtonTest.found ? '✅ FOUND' : '❌ NOT FOUND'} | ${testResults.createUserButtonTest.responsive ? '✅ RESPONSIVE' : '❌ NOT RESPONSIVE'}`);
    
    console.log(`\n📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('\n🎉 Test completed!');
    
    // Keep browser open for a few seconds so you can see the final state
    console.log('\n⏱️ Keeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (page) {
      try {
        const screenshotsDir = '/Users/ibrahimkashif/Desktop/CopperCore/screenshots';
        await page.screenshot({ 
          path: path.join(screenshotsDir, 'simple-error-screenshot.png'),
          fullPage: true 
        });
        console.log('📷 Error screenshot saved: simple-error-screenshot.png');
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
