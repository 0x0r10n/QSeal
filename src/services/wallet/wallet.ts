/**
 * Browser wallets via the Wallet Standard (Phantom, Solflare, Backpack, …).
 * The gateway builds each USDC transfer; the wallet only signs and sends it,
 * so no Solana SDK ships to the browser.
 */
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { useSyncExternalStore } from 'react'
import { local, readJSON, remove, writeJSON } from '@/lib/storage'
import { base64ToBytes, toBase58 } from '../crypto/bytes'

const CONNECT = 'standard:connect'
const DISCONNECT = 'standard:disconnect'
const EVENTS = 'standard:events'
const SIGN_AND_SEND = 'solana:signAndSendTransaction'
const LAST = 'qseal.wallet.last'

type Features = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface WalletState {
  available: Wallet[]
  wallet: Wallet | null
  account: WalletAccount | null
  connecting: boolean
}

let state: WalletState = { available: [], wallet: null, account: null, connecting: false }
const listeners = new Set<() => void>()
const set = (patch: Partial<WalletState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const isSolanaWallet = (w: Wallet) =>
  w.chains.some((c) => c.startsWith('solana:')) && SIGN_AND_SEND in w.features && CONNECT in w.features

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  const api = getWallets()
  const refresh = () => set({ available: api.get().filter(isSolanaWallet) })
  refresh()
  api.on('register', refresh)
  api.on('unregister', refresh)
  // Quietly restore the last wallet the user connected.
  const last = readJSON<string | null>(local, LAST, null)
  if (last) {
    const tryRestore = () => {
      const w = state.available.find((x) => x.name === last)
      if (w && !state.wallet) void connectWallet(w, { silent: true }).catch(() => {})
    }
    tryRestore()
    api.on('register', tryRestore)
  }
}

export function useWallet(): WalletState {
  start()
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    () => state,
    () => state,
  )
}

export async function connectWallet(wallet: Wallet, opts: { silent?: boolean } = {}) {
  set({ connecting: true })
  try {
    const features = wallet.features as Features
    const { accounts } = await features[CONNECT].connect(opts.silent ? { silent: true } : undefined)
    const account = (accounts as WalletAccount[]).find((a) => a.chains.some((c) => c.startsWith('solana:'))) ?? accounts[0]
    if (!account) throw new Error('The wallet did not share an account')
    set({ wallet, account })
    writeJSON(local, LAST, wallet.name)
    features[EVENTS]?.on('change', ({ accounts: next }: { accounts?: readonly WalletAccount[] }) => {
      if (next) set({ account: next[0] ?? null, wallet: next[0] ? wallet : null })
    })
  } finally {
    set({ connecting: false })
  }
}

export async function disconnectWallet() {
  const features = state.wallet?.features as Features | undefined
  try {
    await features?.[DISCONNECT]?.disconnect()
  } catch {
    /* some wallets do not implement disconnect */
  }
  remove(local, LAST)
  set({ wallet: null, account: null })
}

/** Ask the wallet to sign and submit a gateway-built transaction. Returns the base58 signature. */
export async function signAndSend(transactionBase64: string, chain: string): Promise<string> {
  const { wallet, account } = state
  if (!wallet || !account) throw new Error('Connect a wallet first')
  if (!account.chains.includes(chain as `${string}:${string}`) && !wallet.chains.includes(chain as `${string}:${string}`)) {
    throw new Error(`${wallet.name} does not support ${chain.replace('solana:', 'Solana ')}`)
  }
  const features = wallet.features as Features
  const [out] = await features[SIGN_AND_SEND].signAndSendTransaction({
    account,
    chain,
    transaction: base64ToBytes(transactionBase64),
    options: { commitment: 'confirmed' },
  })
  return toBase58(out.signature as Uint8Array)
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
