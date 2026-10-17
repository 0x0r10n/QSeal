/**
 * Browser wallets via the Wallet Standard (Phantom, Solflare, Backpack, …).
 * The gateway builds each USDC transfer; the wallet only signs and sends it,
 * so no Solana SDK ships to the browser.
 */
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { useSyncExternalStore } from 'react'
import { local, readJSON, remove, writeJSON } from '@/lib/storage'
import { base64ToBytes, fromBase58, toBase58 } from '../crypto/bytes'

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
  connectingWalletName: string | null
  error: string | null
}

let state: WalletState = {
  available: [],
  wallet: null,
  account: null,
  connecting: false,
  connectingWalletName: null,
  error: null,
}

const listeners = new Set<() => void>()
const set = (patch: Partial<WalletState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const isSolanaWallet = (w: Wallet) =>
  (w.chains?.some((c) => c.startsWith('solana:')) ||
    w.name.toLowerCase().includes('phantom') ||
    w.name.toLowerCase().includes('solflare') ||
    w.name.toLowerCase().includes('backpack')) &&
  CONNECT in (w.features || {})

export function getPhantomProvider() {
  if (typeof window === 'undefined') return null
  const w = window as any // eslint-disable-line @typescript-eslint/no-explicit-any
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana
  if (w.solana?.isPhantom) return w.solana
  return null
}

export function getSolflareProvider() {
  if (typeof window === 'undefined') return null
  const w = window as any // eslint-disable-line @typescript-eslint/no-explicit-any
  if (w.solflare?.isSolflare) return w.solflare
  return null
}

function getInjectedSolanaWallets(): Wallet[] {
  if (typeof window === 'undefined') return []
  const injected: Wallet[] = []

  const phantom = getPhantomProvider()
  if (phantom) {
    injected.push({
      name: 'Phantom',
      version: '1.0.0',
      icon: 'data:image/svg+xml;utf8,<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="%23AB9FF2"/><path d="M106.88 64.91c0-23.7-19.21-42.91-42.91-42.91-23.7 0-42.91 19.21-42.91 42.91 0 20.35 14.16 37.38 33.15 41.77v-13.88c0-2.36 1.91-4.27 4.27-4.27h4.84c2.36 0 4.27 1.91 4.27 4.27v13.88c18.99-4.39 33.15-21.42 33.15-41.77z" fill="%23fff"/></svg>',
      chains: ['solana:mainnet', 'solana:devnet'],
      features: {
        [CONNECT]: {
          connect: async (options?: { silent?: boolean }) => {
            const res = await phantom.connect(options?.silent ? { onlyIfTrusted: true } : undefined)
            const pubkey = res?.publicKey || phantom.publicKey
            const pubkeyStr = typeof pubkey?.toBase58 === 'function' ? pubkey.toBase58() : pubkey?.toString() || ''
            return {
              accounts: [
                {
                  address: pubkeyStr,
                  publicKey: fromBase58(pubkeyStr),
                  chains: ['solana:mainnet', 'solana:devnet'],
                  features: [SIGN_AND_SEND],
                },
              ],
            }
          },
        },
        [DISCONNECT]: {
          disconnect: async () => {
            await phantom.disconnect()
          },
        },
        [SIGN_AND_SEND]: {
          signAndSendTransaction: async ({ transaction }: { transaction: Uint8Array }) => {
            const signed = await phantom.signAndSendTransaction(transaction)
            return [{ signature: signed.signature }]
          },
        },
      },
      accounts: [],
    } as unknown as Wallet)
  }

  const solflare = getSolflareProvider()
  if (solflare && !injected.some((x) => x.name.toLowerCase() === 'solflare')) {
    injected.push({
      name: 'Solflare',
      version: '1.0.0',
      icon: 'data:image/svg+xml;utf8,<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="%23FC4A1A"/><path d="M64 28l28 56H36l28-56z" fill="%23fff"/></svg>',
      chains: ['solana:mainnet', 'solana:devnet'],
      features: {
        [CONNECT]: {
          connect: async (options?: { silent?: boolean }) => {
            await solflare.connect(options?.silent ? { onlyIfTrusted: true } : undefined)
            const pubkeyStr = solflare.publicKey?.toString() || ''
            return {
              accounts: [
                {
                  address: pubkeyStr,
                  publicKey: fromBase58(pubkeyStr),
                  chains: ['solana:mainnet', 'solana:devnet'],
                  features: [SIGN_AND_SEND],
                },
              ],
            }
          },
        },
        [DISCONNECT]: {
          disconnect: async () => {
            await solflare.disconnect()
          },
        },
        [SIGN_AND_SEND]: {
          signAndSendTransaction: async ({ transaction }: { transaction: Uint8Array }) => {
            const signed = await solflare.signAndSendTransaction(transaction)
            return [{ signature: signed.signature }]
          },
        },
      },
      accounts: [],
    } as unknown as Wallet)
  }

  return injected
}

export function refreshWallets() {
  if (typeof window === 'undefined') return
  const api = getWallets()
  const standard = api.get().filter(isSolanaWallet)
  const injected = getInjectedSolanaWallets()
  const combined = [...standard]
  for (const inj of injected) {
    if (!combined.some((c) => c.name.toLowerCase() === inj.name.toLowerCase())) {
      combined.push(inj)
    }
  }
  set({ available: combined })
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  const api = getWallets()

  refreshWallets()
  api.on('register', refreshWallets)
  api.on('unregister', refreshWallets)
  window.addEventListener('load', refreshWallets)
  window.addEventListener('focus', refreshWallets)
  setTimeout(refreshWallets, 150)
  setTimeout(refreshWallets, 500)
  setTimeout(refreshWallets, 1500)

  // Quietly restore the last wallet the user connected.
  const last = readJSON<string | null>(local, LAST, null)
  if (last) {
    const tryRestore = () => {
      const w = state.available.find((x) => x.name.toLowerCase() === last.toLowerCase())
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
  const isPhantom = wallet.name.toLowerCase().includes('phantom')
  const isSolflare = wallet.name.toLowerCase().includes('solflare')

  set({ connecting: true, connectingWalletName: wallet.name, error: null })
  try {
    let account: WalletAccount | null = null
    const features = (wallet.features || {}) as Features

    // 1. For Phantom, prefer native window.phantom.solana directly for maximum reliability
    if (isPhantom) {
      const phantom = getPhantomProvider()
      if (phantom) {
        try {
          const res = await phantom.connect(opts.silent ? { onlyIfTrusted: true } : undefined)
          const pubkey = res?.publicKey || phantom.publicKey
          if (pubkey) {
            const pubkeyStr = typeof pubkey.toBase58 === 'function' ? pubkey.toBase58() : pubkey.toString()
            account = {
              address: pubkeyStr,
              publicKey: fromBase58(pubkeyStr),
              chains: ['solana:mainnet', 'solana:devnet'],
              features: [SIGN_AND_SEND],
            }
          }
        } catch (phErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (opts.silent) return
          if (phErr?.code === 4001 || phErr?.message?.toLowerCase().includes('rejected') || phErr?.message?.toLowerCase().includes('cancelled')) {
            throw new Error('Connection request was declined or closed in Phantom. Please unlock your wallet and approve.')
          }
          if (phErr?.code === -32002 || phErr?.message?.toLowerCase().includes('already pending')) {
            throw new Error('Phantom popup is already open. Please check the Phantom window to unlock and approve.')
          }
          // If native connect threw an unexpected error, attempt standard connect below
        }
      }
    }

    // 2. Try standard connect feature if account not resolved yet
    if (!account && features[CONNECT]?.connect) {
      try {
        const connectInput = opts.silent ? { silent: true } : {}
        const { accounts } = await features[CONNECT].connect(connectInput)
        account = (accounts as WalletAccount[])?.find((a) => a.chains?.some((c) => c.startsWith('solana:'))) ?? accounts?.[0] ?? null
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (opts.silent) return
        if (err?.code === 4001 || err?.message?.toLowerCase().includes('rejected') || err?.message?.toLowerCase().includes('cancelled')) {
          throw new Error('Connection request was declined or closed. Please unlock your wallet and approve.')
        }
        if (err?.code === -32002 || err?.message?.toLowerCase().includes('already pending')) {
          throw new Error('Wallet popup is already open. Please check your wallet window to unlock and approve.')
        }
        throw err
      }
    }

    // 3. Fallback for Solflare
    if (!account && isSolflare) {
      const solflare = getSolflareProvider()
      if (solflare) {
        try {
          await solflare.connect(opts.silent ? { onlyIfTrusted: true } : undefined)
          const pubkeyStr = solflare.publicKey?.toString()
          if (pubkeyStr) {
            account = {
              address: pubkeyStr,
              publicKey: fromBase58(pubkeyStr),
              chains: ['solana:mainnet', 'solana:devnet'],
              features: [SIGN_AND_SEND],
            }
          }
        } catch (sfErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (opts.silent) return
          throw sfErr
        }
      }
    }

    if (!account) {
      if (opts.silent) return
      throw new Error('The wallet did not share an account. Please check the Phantom extension popup to unlock your wallet and approve.')
    }

    set({ wallet, account, error: null })
    writeJSON(local, LAST, wallet.name)

    // Wire up events if Phantom
    if (isPhantom) {
      const phantom = getPhantomProvider()
      phantom?.on?.('accountChanged', (publicKey: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (publicKey) {
          const pubkeyStr = publicKey.toString()
          set({
            account: {
              address: pubkeyStr,
              publicKey: fromBase58(pubkeyStr),
              chains: ['solana:mainnet', 'solana:devnet'],
              features: [SIGN_AND_SEND],
            },
          })
        } else {
          set({ account: null, wallet: null })
        }
      })
      phantom?.on?.('disconnect', () => {
        set({ account: null, wallet: null })
      })
    }

    features[EVENTS]?.on?.('change', ({ accounts: next }: { accounts?: readonly WalletAccount[] }) => {
      if (next) set({ account: next[0] ?? null, wallet: next[0] ? wallet : null })
    })
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!opts.silent) {
      const msg = e instanceof Error ? e.message : 'The wallet refused the connection'
      set({ error: msg })
      throw e
    }
  } finally {
    set({ connecting: false, connectingWalletName: null })
  }
}

export async function disconnectWallet() {
  const features = state.wallet?.features as Features | undefined
  try {
    await features?.[DISCONNECT]?.disconnect()
  } catch {
    /* some wallets do not implement disconnect */
  }
  const phantom = getPhantomProvider()
  if (state.wallet?.name.toLowerCase().includes('phantom') && phantom?.disconnect) {
    try {
      await phantom.disconnect()
    } catch {
      /* ignore */
    }
  }
  remove(local, LAST)
  set({ wallet: null, account: null, error: null })
}

/** Ask the wallet to sign and submit a gateway-built transaction. Returns the base58 signature. */
export async function signAndSend(transactionBase64: string, chain: string): Promise<string> {
  const { wallet, account } = state
  if (!wallet || !account) throw new Error('Connect a wallet first')

  // 1. Wallet Standard signAndSendTransaction
  const features = wallet.features as Features
  if (features?.[SIGN_AND_SEND]?.signAndSendTransaction) {
    try {
      const [out] = await features[SIGN_AND_SEND].signAndSendTransaction({
        account,
        chain,
        transaction: base64ToBytes(transactionBase64),
      })
      if (out?.signature) {
        return typeof out.signature === 'string' ? out.signature : toBase58(out.signature as Uint8Array)
      }
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes('User rejected') || msg.includes('User cancelled')) {
        throw err
      }
      console.warn('Wallet standard signAndSendTransaction failed, checking injected fallback:', err)
      if (!wallet.name.toLowerCase().includes('phantom')) {
        throw err
      }
    }
  }

  // 2. Injected Phantom fallback
  if (wallet.name.toLowerCase().includes('phantom')) {
    const phantom = getPhantomProvider()
    if (phantom?.signAndSendTransaction) {
      const signed = await phantom.signAndSendTransaction(base64ToBytes(transactionBase64))
      return signed.signature
        ? (typeof signed.signature === 'string' ? signed.signature : toBase58(signed.signature))
        : toBase58(signed as any)
    }
  }

  throw new Error(`${wallet.name} does not support signing and sending Solana transactions`)
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
