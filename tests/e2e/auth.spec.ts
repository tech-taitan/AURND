import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should show login form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should stay on login page or show error
    await expect(page).toHaveURL(/\/auth/)
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 })
    await expect(page).toHaveURL('/')
  })

  test('should protect calculator route', async ({ page }) => {
    await page.goto('/calculator')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should protect settings route', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
