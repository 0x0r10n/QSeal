import { chromium } from '@playwright/test'
const out = 'screenshots/live'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
const base = 'http://localhost:5180'

await p.goto(base + '/app'); await p.waitForTimeout(2000)
await p.screenshot({ path: `${out}/1-dashboard.png` })

await p.goto(base + '/app/keys'); await p.waitForTimeout(1500)
await p.getByRole('button', { name: 'Create a test key' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/2-keys.png` })

await p.goto(base + '/app/new'); await p.waitForTimeout(1500)
await p.fill('#prompt', 'Summarise the attached contract in three bullet points.')
await p.getByRole('button', { name: 'Seal & send' }).click()
await p.waitForSelector('text=Signature verified', { timeout: 20000 })
await p.screenshot({ path: `${out}/3-request.png`, fullPage: true })
const receipt = await p.evaluate(() => JSON.parse(localStorage.getItem('qseal.history.v1'))[0].receipt)
console.log('receipt', receipt.id, 'sealed', receipt.sealed, 'payment', receipt.payment.type, receipt.payment.amountUsdc)

await p.getByRole('link', { name: 'Inspect' }).click()
await p.getByRole('button', { name: 'Verify', exact: true }).click()
const verdict = () => p.locator('[role=status][aria-live=polite] p.text-lg').first()
await verdict().waitFor({ timeout: 15000 })
console.log('verdict (genuine):', await verdict().innerText())
await p.screenshot({ path: `${out}/4-verify-valid.png`, fullPage: true })

// Tamper: change the token count and verify again.
const tampered = { ...receipt, tokens: { ...receipt.tokens, totalTokens: receipt.tokens.totalTokens + 1 } }
await p.fill('#receipt', JSON.stringify(tampered, null, 2))
await p.getByRole('button', { name: 'Verify', exact: true }).click()
await p.waitForTimeout(2500)
console.log('verdict (tampered):', await verdict().innerText())
await p.screenshot({ path: `${out}/5-verify-tampered.png`, fullPage: true })

// By receipt ID
await p.fill('#receipt', receipt.id)
await p.getByRole('button', { name: 'Verify', exact: true }).click()
await p.waitForTimeout(2500)
console.log('verdict (by id):', await verdict().innerText())
// A different gateway's receipt: swap in foreign public keys.
await p.fill('#receipt', JSON.stringify({ ...receipt, pqc: { ...receipt.pqc, ed25519PublicKey: '00'.repeat(32) } }))
await p.getByRole('button', { name: 'Verify', exact: true }).click()
await p.waitForTimeout(2500)
console.log('verdict (foreign key):', await verdict().innerText(), '|', await p.locator('[role=status][aria-live=polite] p.text-lg + p').innerText())
await p.fill('#receipt', 'hello')
await p.getByRole('button', { name: 'Verify', exact: true }).click()
await p.waitForTimeout(800)
console.log('verdict (junk):', await verdict().innerText())

await p.goto(base + '/app/history'); await p.waitForTimeout(1000)
await p.locator('a[href^="/app/history/"]').first().click(); await p.waitForTimeout(1000)
await p.screenshot({ path: `${out}/6-history-detail.png`, fullPage: true })

await p.goto(base + '/app/models'); await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/7-models.png` })
await p.goto(base + '/app'); await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/8-dashboard-after.png` })
console.log('errors:', errors.length ? errors : 'none')
await b.close()
