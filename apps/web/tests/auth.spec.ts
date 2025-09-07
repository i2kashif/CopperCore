import { test, expect } from '@playwright/test'

test.describe('Auth UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('renders CopperCore ERP heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'CopperCore ERP' })).toBeVisible()
  })

  test('displays Wire & Cable Manufacturing System tagline', async ({ page }) => {
    await expect(page.getByText('Wire & Cable Manufacturing System')).toBeVisible()
  })

  test('has username and password fields with labels', async ({ page }) => {
    // Username field
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible()
    
    // Password field
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  })

  test('can tab through form fields in correct order', async ({ page }) => {
    // Start with username field
    await page.getByLabel('Username').focus()
    await expect(page.getByLabel('Username')).toBeFocused()
    
    // Tab to password field
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()
    
    // Tab to remember me checkbox
    await page.keyboard.press('Tab')
    await expect(page.getByRole('checkbox')).toBeFocused()
    
    // Tab to forgot password link
    await page.keyboard.press('Tab')
    await expect(page.getByText('Forgot password?')).toBeFocused()
    
    // Tab to submit button
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused()
  })

  test('shows validation error for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText('Please fill in all fields')).toBeVisible()
  })

  test('can type in username and password fields', async ({ page }) => {
    const usernameField = page.getByLabel('Username')
    const passwordField = page.getByLabel('Password')
    
    await usernameField.fill('testuser')
    await expect(usernameField).toHaveValue('testuser')
    
    await passwordField.fill('testpass123')
    await expect(passwordField).toHaveValue('testpass123')
  })

  test('remember me checkbox works', async ({ page }) => {
    const checkbox = page.getByRole('checkbox')
    
    // Initially unchecked
    await expect(checkbox).not.toBeChecked()
    
    // Click to check
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    
    // Click again to uncheck
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('has proper focus rings on interactive elements', async ({ page }) => {
    // Focus username field
    await page.getByLabel('Username').focus()
    const usernameFocus = await page.getByLabel('Username').evaluate(el => {
      const styles = window.getComputedStyle(el)
      return styles.boxShadow || styles.outline
    })
    expect(usernameFocus).toBeTruthy()
    
    // Focus submit button
    await page.getByRole('button', { name: 'Sign in' }).focus()
    const buttonFocus = await page.getByRole('button', { name: 'Sign in' }).evaluate(el => {
      const styles = window.getComputedStyle(el)
      return styles.boxShadow || styles.outline
    })
    expect(buttonFocus).toBeTruthy()
  })

  test('displays factory-scoped access message', async ({ page }) => {
    await expect(page.getByText('Factory-scoped access with role-based permissions')).toBeVisible()
  })

  test('displays Pakistan fiscal compliance message', async ({ page }) => {
    await expect(page.getByText('Pakistan fiscal compliance enabled')).toBeVisible()
  })
})