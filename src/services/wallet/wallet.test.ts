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
  vi.unstubAllGlobals()
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

/** Phantom registers a Wallet Standard wallet and also injects window.phantom.solana. */
function phantom({ standard, injected }: { standard: () => Promise<{ accounts: unknown[] }>; injected: (opts?: unknown) => Promise<unknown> }) {
  const standardConnect = vi.fn(standard)
  const injectedConnect = vi.fn(injected)
  const { wallet } = fakeWallet(standardConnect)
  ;(wallet as { name: string }).name = 'Phantom'
  vi.stubGlobal('window', { phantom: { solana: { isPhantom: true, isConnected: false, connect: injectedConnect, disconnect: async () => {} } } })
  return { wallet, standardConnect, injectedConnect }
}
const internalError = Object.assign(new Error('Unexpected error'), { code: -32603 })
const rejected = Object.assign(new Error('User rejected the request.'), { code: 4001 })

describe('connectWallet with Phantom', () => {
  it('connects through Wallet Standard even when the injected provider is failing', async () => {
    const p = phantom({ standard: async () => ({ accounts: [account] }), injected: () => Promise.reject(internalError) })
    await connectWallet(p.wallet)
    expect(getWalletState().account?.address).toBe(ADDRESS)
    expect(p.injectedConnect).not.toHaveBeenCalled()
  })

  it('falls back to the injected provider when Wallet Standard fails', async () => {
    const p = phantom({ standard: () => Promise.reject(internalError), injected: async () => ({ publicKey: { toBase58: () => ADDRESS } }) })
    await connectWallet(p.wallet)
    expect(getWalletState().account?.address).toBe(ADDRESS)
  })

  it('does not try another way after the user rejects', async () => {
    const p = phantom({ standard: () => Promise.reject(rejected), injected: async () => ({ publicKey: { toBase58: () => ADDRESS } }) })
    await expect(connectWallet(p.wallet)).rejects.toThrow(/cancelled/i)
    expect(p.injectedConnect).not.toHaveBeenCalled()
  })

  it('restores silently through the injected provider (onlyIfTrusted), never prompting via Wallet Standard', async () => {
    const p = phantom({ standard: async () => ({ accounts: [account] }), injected: async () => ({ publicKey: { toBase58: () => ADDRESS } }) })
    await connectWallet(p.wallet, { silent: true })
    expect(p.injectedConnect).toHaveBeenCalledWith({ onlyIfTrusted: true })
    expect(p.standardConnect).not.toHaveBeenCalled()
    expect(getWalletState().account?.address).toBe(ADDRESS)
  })
})

describe('overlapping connects', () => {
  it('a click during a pending connect waits for it instead of sending the wallet a second request', async () => {
    let finish!: () => void
    const { wallet } = fakeWallet(() => new Promise((r) => (finish = () => r({ accounts: [account] }))))
    const connect = vi.mocked(wallet.features['standard:connect'] as { connect: () => Promise<unknown> }).connect
    const spy = vi.fn(connect)
    ;(wallet.features['standard:connect'] as { connect: unknown }).connect = spy
    const first = connectWallet(wallet, { silent: true })
    const second = connectWallet(wallet)
    finish()
    await Promise.all([first, second])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(getWalletState().account?.address).toBe(ADDRESS)
  })
})
