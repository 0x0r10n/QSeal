import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
// A minimal Wallet Standard wallet, registered the way real extensions do.
await p.addInitScript(() => {
  const address = 'Vote111111111111111111111111111111111111111'
  const account = { address, publicKey: new Uint8Array(32), chains: ['solana:devnet', 'solana:mainnet'], features: ['solana:signAndSendTransaction'] }
  const wallet = {
    version: '1.0.0',
    name: 'Test Wallet',
    icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'),
    chains: ['solana:devnet', 'solana:mainnet'],
    accounts: [],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
      'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
      'standard:events': { version: '1.0.0', on: () => () => {} },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: async () => { window.__signed = true; return [{ signature: new Uint8Array(64).fill(7) }] },
      },
    },
  }
  const register = ({ register }) => register(wallet)
  window.addEventListener('wallet-standard:app-ready', (e) => register(e.detail))
  try { window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register })) } catch {}
})
const base = 'http://localhost:5180'
let paymentHeader = null
await p.route('**/v1/payments/prepare', (r) => r.fulfill({ json: { transaction: btoa('unsigned-tx'), reference: 'Ref1111111111111111111111111111111111111111', amount_usdc: 0.001, network: 'devnet', wallet_chain: 'solana:devnet', pay_to: 'x' } }))
p.on('request', (r) => { if (r.url().endsWith('/v1/chat/completions') && r.method() === 'POST') paymentHeader = r.headers()['payment-signature'] ?? paymentHeader })
await p.goto(base + '/app/new'); await p.waitForTimeout(1500)
await p.evaluate(() => sessionStorage.clear())
await p.reload(); await p.waitForTimeout(1500)
await p.locator('header').getByRole('button', { name: /Connect wallet/ }).click()
await p.getByRole('menuitem', { name: 'Test Wallet' }).click()
await p.waitForTimeout(500)
console.log('topbar:', await p.locator('header').getByRole('button', { name: /Vote/ }).innerText())
console.log('wallet radio enabled:', await p.locator('input[name=pay]').nth(1).isEnabled(), 'checked:', await p.locator('input[name=pay]').nth(1).isChecked())
await p.fill('#prompt', 'Pay per request test')
await p.getByRole('button', { name: 'Seal & send' }).click()
await p.waitForTimeout(3000)
console.log('alert:', (await p.locator('[role=alert]').allInnerTexts()).join(' / '))
console.log('chamber:', (await p.locator('section[aria-label="Request lifecycle"] ol').innerText()).replace(/\n+/g, ' | '))
console.log('wallet asked to sign:', await p.evaluate(() => Boolean(window.__signed)))
await p.screenshot({ path: 'screenshots/live/9-wallet-error.png', fullPage: true })
console.log('PAYMENT-SIGNATURE sent:', paymentHeader ? JSON.parse(atob(paymentHeader)) : null)
const unused = await p.getByText('Your last payment was not used').count()
console.log('offers to reuse payment:', unused > 0)
console.log('errors:', errors.length ? errors : 'none')
await b.close()
