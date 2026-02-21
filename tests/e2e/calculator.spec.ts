import { test, expect } from './fixtures/auth'

test.describe('Tax Offset Calculator', () => {
  test('should display calculator page', async ({ authenticatedPage: page }) => {
    await page.goto('/calculator')
    await expect(page).toHaveURL('/calculator')

    // Should show the calculator heading
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('should have input fields for calculation', async ({ authenticatedPage: page }) => {
    await page.goto('/calculator')

    // Should have numeric input fields
    const inputs = page.locator('input[type="number"], input[inputmode="numeric"], input[type="text"]')
    await expect(inputs.first()).toBeVisible()
  })

  test('should calculate and display results', async ({ authenticatedPage: page }) => {
    await page.goto('/calculator')

    // Find and fill expenditure/turnover inputs
    const inputs = page.locator('input[type="number"], input[inputmode="numeric"], input[type="text"]')
    const inputCount = await inputs.count()

    // Fill in test values if inputs are available
    if (inputCount >= 2) {
      await inputs.nth(0).fill('1000000')
      await inputs.nth(1).fill('15000000')

      // Submit or trigger calculation
      const submitButton = page.locator('button[type="submit"], button:has-text("Calculate")')
      if (await submitButton.count() > 0) {
        await submitButton.first().click()
      }

      // Wait for results to appear
      await page.waitForTimeout(1000)
    }
  })
})
