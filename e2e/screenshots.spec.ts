import { test } from '@playwright/test'

/** Visual QA captures — run with `npx playwright test screenshots`. Output goes to ./screenshots. */
const PAGES = ['/', '/technology', '/security', '/docs', '/sign-in', '/app', '/app/new', '/app/history', '/app/verify', '/app/models', '/app/keys', '/app/settings']

for (const path of PAGES) {
  test(`capture ${path}`, async ({ page }, info) => {
    test.skip(!process.env.CAPTURE, 'set CAPTURE=1 to take screenshots')
    await page.goto(path)
    await page.waitForTimeout(path === '/' ? 3500 : 1200)
    const name = path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')
    await page.screenshot({ path: `screenshots/${info.project.name}/${name}.png` })
    if (!path.startsWith('/app')) {
      // Scroll through to trigger reveals, then capture the full page.
      const h = await page.evaluate(() => document.body.scrollHeight)
      for (let y = 0; y < h; y += 500) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y)
        await page.waitForTimeout(120)
      }
      await page.waitForTimeout(800)
      await page.screenshot({ path: `screenshots/${info.project.name}/${name}-full.png`, fullPage: true })
    }
  })
}
