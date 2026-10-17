import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Wallet } from '@wallet-standard/base'
import { connectWallet, disconnectWallet, getWalletState, openInWalletLinks } from './wallet'

const ADDRESS = 'Vote111111111111111111111111111111111111111'
const account = { address: ADDRESS, publicKey: new Uint8Array(32), chains: ['solana:mainnet'], features: [] }

/** A Wallet Standard wallet whose `standard:events` listeners can be counted. */
function fakeWallet(connect: () => Promise<{ accounts: unknown[] }> = async () => ({ accounts: [account] })) {
  const listeners = new Set<() => void>()
  const wallet = {
    version: '1.0.0',
    name: 'Test Wallet',
    icon: 'data:image/svg+xml;base64,',
    chains: ['solana:mainnet'],
    accounts: [],
    features: {
      'standard:connect': { version: '1.0.0', connect },
      'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
      'standard:events': {
        version: '1.0.0',
        on: (_e: string, l: () => void) => {
          listeners.add(l)
          return () => listeners.delete(l)
        },
      },
    },
  } as unknown as Wallet
  return { wallet, listeners }
}

afterEach(async () => {
  vi.useRealTimers()
  await disconnectWallet()
})

describe('connectWallet', () => {
  it('keeps one account-change listener across reconnects, and none after disconnect', async () => {
    const { wallet, listeners } = fakeWallet()
    await connectWallet(wallet)
    await connectWallet(wallet)
    expect(listeners.size).toBe(1)
    await disconnectWallet()
    expect(listeners.size).toBe(0)
  })

  it('gives up on a wallet that never answers, instead of staying on "Connecting…"', async () => {
    vi.useFakeTimers()
    const { wallet } = fakeWallet(() => new Promise(() => {}))
    const attempt = connectWallet(wallet)
    const settled = expect(attempt).rejects.toThrow(/didn.t respond/)
    await vi.advanceTimersByTimeAsync(60_000)
    await settled
    expect(getWalletState()).toMatchObject({ connecting: false, account: null, error: expect.stringMatching(/didn.t respond/) })
  })

  it('a silent restore that never answers stops quietly, so the app does not spin forever', async () => {
    vi.useFakeTimers()
    const { wallet } = fakeWallet(() => new Promise(() => {}))
    const attempt = connectWallet(wallet, { silent: true })
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(attempt).resolves.toBeUndefined()
    expect(getWalletState()).toMatchObject({ connecting: false, account: null, error: null })
  })
})

describe('openInWalletLinks', () => {
  it('builds the documented browse deeplinks with the page and origin URL-encoded', () => {
    expect(openInWalletLinks('https://app.qrouter.cloud/sign-in?x=1')).toEqual([
      {
        name: 'Phantom',
        href: 'https://phantom.com/ul/browse/https%3A%2F%2Fapp.qrouter.cloud%2Fsign-in%3Fx%3D1?ref=https%3A%2F%2Fapp.qrouter.cloud',
      },
      {
        name: 'Solflare',
        href: 'https://solflare.com/ul/v1/browse/https%3A%2F%2Fapp.qrouter.cloud%2Fsign-in%3Fx%3D1?ref=https%3A%2F%2Fapp.qrouter.cloud',
      },
    ])
  })
})
