import { expect, test } from '@playwright/test'

test.describe('public site', () => {
  test('landing page is a marketing page, not the dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Intelligence deserves privacy')
    await expect(page.getByRole('navigation', { name: 'Application' })).toHaveCount(0)
    await expect(page.locator('#prompt')).toHaveCount(0)
  })

  test('has no horizontal overflow', async ({ page }) => {
    const width = page.viewportSize()!.width
    for (const path of ['/', '/technology', '/security', '/docs', '/sign-in', '/app', '/app/new', '/app/history']) {
      await page.goto(path)
      await page.waitForTimeout(400)
      // On mobile, overflowing content widens the layout viewport itself.
      const { inner, scroll } = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }))
      expect(inner, path).toBe(width)
      expect(scroll, path).toBeLessThanOrEqual(width)
    }
  })

  test('navigates to technology and launches the app', async ({ page, isMobile }) => {
    await page.goto('/')
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.locator('#mobile-menu').getByRole('link', { name: 'Technology' }).click()
    } else {
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Technology' }).click()
    }
    await expect(page).toHaveURL(/\/technology$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Infrastructure for inference')

    await page.getByRole('link', { name: /Launch App/ }).first().click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('application', () => {
  test('moves between app pages', async ({ page, isMobile }) => {
    await page.goto('/app')
    const routes: Array<[string, RegExp]> = [
      ['New Request', /\/app\/new$/],
      ['History', /\/app\/history$/],
      ['Verify Receipt', /\/app\/verify$/],
      ['Models', /\/app\/models$/],
      ['Prepaid Keys', /\/app\/keys$/],
      ['Settings', /\/app\/settings$/],
    ]
    for (const [label, url] of routes) {
      if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('navigation', { name: 'Application' }).getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('new request handles a missing backend gracefully', async ({ page }) => {
    await page.goto('/app/new')
    await expect(page.getByText('No backend connected.')).toBeVisible()
    await page.locator('#prompt').fill('Hello')
    await expect(page.getByRole('button', { name: 'Seal & send' })).toBeDisabled()
    await expect(page.getByText('Sending is disabled because no backend is configured')).toBeVisible()
  })

  test('verify never reports valid without a verifier', async ({ page }) => {
    await page.goto('/app/verify')
    await page.locator('#receipt').fill('{"signature":"abc"}')
    await page.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(page.getByText('Unable to verify', { exact: true })).toBeVisible()
    await page.locator('#receipt').fill('not json')
    await page.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(page.getByText('Unsupported format', { exact: true })).toBeVisible()
  })
})
