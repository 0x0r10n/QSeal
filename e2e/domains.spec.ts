import { expect, test } from '@playwright/test'

/**
 * qrouter.cloud is the marketing site; app.qrouter.cloud serves sign-in and the app.
 * Both hostnames are served from the local offline build, so the cross-domain hops are real
 * navigations without touching production. The production gateway is kept unreachable.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.route(/^https:\/\/api\.qrouter\.cloud\//, (r) => r.abort())
  await context.route(/^https:\/\/(app\.)?qrouter\.cloud\//, async (r) => {
    const { pathname, search } = new URL(r.request().url())
    // A request can still be in flight when the test ends and closes the page; that is not a failure.
    await r.fetch({ url: `${baseURL}${pathname}${search}` }).then((response) => r.fulfill({ response })).catch(() => {})
  })
})

test.skip(({ isMobile }) => isMobile, 'routing is the same on every viewport')

test('Launch App on qrouter.cloud opens the standalone sign-in card on app.qrouter.cloud', async ({ page }) => {
  await page.goto('https://qrouter.cloud/')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /Launch App/ }).click()
  await expect(page).toHaveURL('https://app.qrouter.cloud/sign-in')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to QRouter')
  // Just the card: no marketing header or footer.
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
})

test('sign-in opened on qrouter.cloud moves to app.qrouter.cloud', async ({ page }) => {
  await page.goto('https://qrouter.cloud/sign-in')
  await expect(page).toHaveURL('https://app.qrouter.cloud/sign-in')
})

test('marketing pages opened on app.qrouter.cloud move to qrouter.cloud', async ({ page }) => {
  await page.goto('https://app.qrouter.cloud/technology?ref=x')
  await expect(page).toHaveURL('https://qrouter.cloud/technology?ref=x')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Infrastructure for inference')
})

test('app.qrouter.cloud itself opens the app, or sign-in when signed out', async ({ page }) => {
  await page.goto('https://app.qrouter.cloud/')
  await expect(page).toHaveURL('https://app.qrouter.cloud/sign-in')

  await page.evaluate(() => sessionStorage.setItem('qrouter.accessKey', JSON.stringify('qrouter_sk_' + '0'.repeat(48))))
  await page.goto('https://app.qrouter.cloud/')
  await expect(page).toHaveURL('https://app.qrouter.cloud/app')
  await expect(page.getByRole('navigation', { name: 'Application' })).toBeAttached()
})
