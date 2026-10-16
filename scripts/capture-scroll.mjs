import { chromium } from '@playwright/test'
const [,, url, out, w, h, isMobile] = process.argv
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: isMobile === '1', hasTouch: isMobile === '1' })
await p.goto(url); await p.waitForTimeout(3000)
const H = await p.evaluate(() => document.body.scrollHeight)
let i = 0
for (let y = 0; y < H; y += +h * 0.9) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(1400)
  await p.screenshot({ path: `${out}-${String(i++).padStart(2, '0')}.png` })
}
console.log(H, i)
await b.close()
