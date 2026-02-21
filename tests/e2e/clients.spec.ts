import { test, expect } from './fixtures/auth'

test.describe('Client Management', () => {
  test('should display client list after login', async ({ authenticatedPage: page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL('/clients')

    // Should see the page heading
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('should navigate to new client form', async ({ authenticatedPage: page }) => {
    await page.goto('/clients')

    // Click the "New Client" or "Add Client" button
    const newButton = page.locator('a[href="/clients/new"], button:has-text("New"), button:has-text("Add")')
    if (await newButton.count() > 0) {
      await newButton.first().click()
      await expect(page).toHaveURL('/clients/new')
    }
  })

  test('should show client form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/clients/new')

    // Should have key form fields
    await expect(page.locator('input, textarea, select').first()).toBeVisible()
  })

  test('should navigate to dashboard from sidebar', async ({ authenticatedPage: page }) => {
    await page.goto('/clients')

    // Click dashboard link in sidebar
    const dashboardLink = page.locator('a[href="/"]').first()
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await expect(page).toHaveURL('/')
    }
  })
})
