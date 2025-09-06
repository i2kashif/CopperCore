import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the main heading is present
  await expect(page.locator('h1')).toContainText('CopperCore ERP')
  
  // Check that the scanner component loads
  await expect(page.locator('h2')).toContainText('QR/Barcode Scanner')
  
  // Check that the input field is present and focusable
  const input = page.locator('input[placeholder*="Enter or scan code"]')
  await expect(input).toBeVisible()
  await expect(input).toBeFocused()
})

test('scanner input functionality', async ({ page }) => {
  await page.goto('/')
  
  const input = page.locator('input[placeholder*="Enter or scan code"]')
  const scanButton = page.locator('button', { hasText: 'Scan' })
  
  // Enter test data
  await input.fill('PU240001')
  
  // Click scan button
  await scanButton.click()
  
  // Check that scanned data appears
  await expect(page.locator('text=Scanned Data:')).toBeVisible()
  await expect(page.locator('.font-mono')).toContainText('PU240001')
  
  // Check that input is cleared
  await expect(input).toHaveValue('')
})

test('scanner keyboard interaction', async ({ page }) => {
  await page.goto('/')
  
  const input = page.locator('input[placeholder*="Enter or scan code"]')
  
  // Enter test data and press Enter
  await input.fill('PU240002')
  await input.press('Enter')
  
  // Check that data was processed
  await expect(page.locator('.font-mono')).toContainText('PU240002')
  await expect(input).toHaveValue('')
})