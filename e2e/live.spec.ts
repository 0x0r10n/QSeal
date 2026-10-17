import { expect, test, type Page } from '@playwright/test'

/**
 * Full journeys against a real QSeal gateway in development mode (no model
 * provider or Solana RPC is needed: the gateway issues free test keys and
 * answers with its labelled dev engine).
 */

// The app is behind sign-in, so get a dev key from the gateway and sign in with it the way a user would.
async function createTestKey(page: Page) {
  const res = await page.request.post('http://localhost:4021/v1/keys/prepaid', { data: { dev: true, amount_usdc: 5 } })
  const { api_key } = await res.json()
  await page.goto('/sign-in')
  await page.locator('#key').fill(api_key)
  await page.getByRole('button', { name: 'Continue with key' }).click()
  await expect(page).toHaveURL(/\/app/)
  await page.goto('/app/keys')
}

const verdict = (page: Page) => page.locator('[role=status][aria-live=polite] p.text-lg').first()

test('pays with a prepaid key, seals the prompt, and verifies the receipt', async ({ page }) => {
  await createTestKey(page)
  await expect(page.getByText('5 USDC', { exact: true })).toBeVisible()

  await page.goto('/app/new')
  await expect(page.getByRole('button', { name: /Sealed \(ML-KEM-768\)/ })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#prompt').fill('Summarise the attached contract in three bullet points.')
  await page.getByRole('button', { name: 'Seal & send' }).click()

  await expect(page.getByText('Signature verified')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('[QSeal dev engine')).toBeVisible()
  const chamber = page.locator('section[aria-label="Request lifecycle"]')
  await expect(chamber).toContainText('Charged to your prepaid key')
  await expect(chamber).toContainText('ML-KEM-768 + AES-256-GCM')
  await expect(chamber).toContainText('Verified in this browser')

  // The key was charged.
  await page.goto('/app/keys')
  await expect(page.getByText('4.999 USDC', { exact: true })).toBeVisible()
})

test('verify: genuine, tampered, foreign-key, by ID, and junk receipts', async ({ page }) => {
  await createTestKey(page)
  await page.goto('/app/new')
  await page.locator('#prompt').fill('Receipt please')
  await page.getByRole('button', { name: 'Seal & send' }).click()
  await expect(page.getByText('Signature verified')).toBeVisible({ timeout: 20_000 })
  const receipt = await page.evaluate(() => JSON.parse(localStorage.getItem('qrouter.history.v1')!)[0].receipt)

  await page.goto('/app/verify')
  const check = async (input: string, expected: string) => {
    await page.locator('#receipt').fill(input)
    await page.getByRole('button', { name: 'Verify', exact: true }).click()
    // The previous verdict fades out first; wait for the new one.
    await expect(verdict(page)).toHaveText(expected)
  }

  await check(JSON.stringify(receipt), 'Valid')
  await check(JSON.stringify({ ...receipt, tokens: { ...receipt.tokens, totalTokens: 1 } }), 'Invalid')
  await check(JSON.stringify({ ...receipt, pqc: { ...receipt.pqc, ed25519PublicKey: '00'.repeat(32) } }), 'Invalid')
  await expect(page.getByText('not signed with the connected gateway’s published keys')).toBeVisible()
  await check(receipt.id, 'Valid')
  await check('hello', 'Unsupported format')
})

test('shows real catalogue data and the development-mode warning', async ({ page }) => {
  await createTestKey(page)
  await page.goto('/app/models')
  await expect(page.getByText('qrouter-quantum-70b')).toBeVisible()
  await expect(page.getByText('0.001 USDC').first()).toBeVisible()
  await expect(page.getByText(/Development gateway/)).toBeVisible()
})

test('wallet: connect, pay per request, and keep an unused payment for retry', async ({ page }) => {
  // Register a Wallet Standard wallet the way browser extensions do.
  await page.addInitScript(() => {
    const account = {
      address: 'Vote111111111111111111111111111111111111111',
      publicKey: new Uint8Array(32),
      chains: ['solana:devnet', 'solana:mainnet'],
      features: ['solana:signAndSendTransaction'],
    }
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
          signAndSendTransaction: async () => [{ signature: new Uint8Array(64).fill(7) }],
        },
      },
    }
    const register = ({ register }: { register: (w: unknown) => void }) => register(wallet)
    window.addEventListener('wallet-standard:app-ready', (e) => register((e as CustomEvent).detail))
    window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }))
  })
  // The sandbox has no Solana RPC, so stand in for the gateway's transaction builder.
  await page.route('**/v1/payments/prepare', (r) =>
    r.fulfill({ json: { transaction: btoa('tx'), reference: 'Ref1111111111111111111111111111111111111111', amount_usdc: 0.001, network: 'devnet', wallet_chain: 'solana:devnet', pay_to: 'x' } }),
  )
  let paymentHeader: string | undefined
  page.on('request', (r) => {
    if (r.url().endsWith('/v1/chat/completions') && r.method() === 'POST') paymentHeader = r.headers()['payment-signature']
  })

  // Sign in with the wallet (sign-in redirects into the app once connected), then open New Request.
  await page.goto('/sign-in')
  await page.getByRole('button', { name: /Connect wallet/ }).click()
  await page.getByRole('menuitem', { name: 'Test Wallet' }).click()
  await expect(page).toHaveURL(/\/app/)
  await page.getByRole('link', { name: 'New Request' }).first().click()
  await expect(page.locator('header').getByRole('button', { name: /Vote…1111/ })).toBeVisible()
  // A newly connected wallet starts on its free trial; choose pay-per-request to exercise x402.
  await expect(page.getByRole('radio', { name: /Free Trial/ })).toBeChecked()
  await page.getByRole('radio', { name: /Wallet, pay per request/ }).check()

  await page.locator('#prompt').fill('Pay per request')
  await page.getByRole('button', { name: 'Seal & send' }).click()

  // The gateway received the wallet's signature as an x402 payment (and could not confirm it here).
  // The gateway polls for on-chain confirmation for up to 20 s (CONFIRM_WAIT_MS) before refusing.
  await expect(page.getByRole('alert')).toContainText('Payment required', { timeout: 30_000 })
  expect(JSON.parse(Buffer.from(paymentHeader!, 'base64').toString())).toMatchObject({
    x402Version: 2,
    reference: 'Ref1111111111111111111111111111111111111111',
  })
  await expect(page.getByText('Your last payment was not used')).toBeVisible()
})
