import { test as base, expect, Page } from '@playwright/test'

/**
 * Extended test fixture with authenticated session.
 *
 * Uses the seeded admin credentials from seed:admin script:
 *   Email: admin@example.com
 *   Password: Admin123!
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, runTest) => {
    // Navigate to login
    await page.goto('/auth/login')

    // Fill in credentials
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'Admin123!')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 })

    await runTest(page)
  },
})

export { expect }
