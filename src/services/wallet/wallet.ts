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

// Only the injected-provider fallbacks need a Transaction object, so the Solana SDK loads on demand
// instead of shipping in the landing page bundle.
async function parseTransactionObject(bytes: Uint8Array) {
  const { Transaction, VersionedTransaction } = await import('@solana/web3.js')
  try {
    return Transaction.from(bytes)
  } catch {
    return VersionedTransaction.deserialize(bytes)
  }
}

const CONNECT = 'standard:connect'
const DISCONNECT = 'standard:disconnect'
const EVENTS = 'standard:events'
const SIGN_AND_SEND = 'solana:signAndSendTransaction'
const LAST = 'qrouter.wallet.last'
const LEGACY_LAST = 'qseal.wallet.last'

type Features = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
/** What wallets throw: an Error or an EIP-1193-style `{ code, message }`. */
type WalletError = { message?: string; code?: number } | null | undefined

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
            const txObj = await parseTransactionObject(transaction)
            const signed = await phantom.signAndSendTransaction(txObj)
            const sig = signed?.signature || signed
            return [{ signature: typeof sig === 'string' ? sig : toBase58(sig as Uint8Array) }]
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
            const txObj = await parseTransactionObject(transaction)
            const signed = await solflare.signAndSendTransaction(txObj)
            const sig = signed?.signature || signed
            return [{ signature: typeof sig === 'string' ? sig : toBase58(sig as Uint8Array) }]
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
  const last = readJSON<string | null>(local, LAST, null) ?? readJSON<string | null>(local, LEGACY_LAST, null)
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

function cleanWalletError(err: WalletError, walletName: string = 'Phantom'): string {
  const msg = String(err?.message || err || '')
  const code = err?.code

  if (
    code === 4001 ||
    msg.toLowerCase().includes('user rejected') ||
    msg.toLowerCase().includes('rejected') ||
    msg.toLowerCase().includes('cancelled') ||
    msg.toLowerCase().includes('declined')
  ) {
    return `Connection request was cancelled in ${walletName}.`
  }
  if (code === -32002 || msg.toLowerCase().includes('already pending')) {
    return `${walletName} popup is already open. Check the extension window to unlock and approve.`
  }
  if (
    msg.toLowerCase().includes('unexpected error') ||
    msg.toLowerCase().includes('disconnected port') ||
    msg.toLowerCase().includes('failed to send message') ||
    code === -32603
  ) {
    return `${walletName} is unresponsive or locked. Click the extension icon in your browser to unlock it, then retry.`
  }
  if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not share an account')) {
    return `No account shared. Please unlock ${walletName} and approve the connection.`
  }
  return msg || `${walletName} refused the connection.`
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
        // If already connected and authorized, use existing pubkey immediately
        if (phantom.isConnected && phantom.publicKey) {
          const pubkeyStr = typeof phantom.publicKey.toBase58 === 'function' ? phantom.publicKey.toBase58() : phantom.publicKey.toString()
          account = {
            address: pubkeyStr,
            publicKey: fromBase58(pubkeyStr),
            chains: ['solana:mainnet', 'solana:devnet'],
            features: [SIGN_AND_SEND],
          }
        } else {
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
            // If MV3 service worker went idle / port disconnected, give it 350ms to wake up and retry once
            const isWorkerAsleep =
              phErr?.message?.toLowerCase().includes('unexpected error') ||
              phErr?.message?.toLowerCase().includes('disconnected port') ||
              phErr?.code === -32603

            if (isWorkerAsleep) {
              await new Promise((r) => setTimeout(r, 350))
              try {
                const retryRes = await phantom.connect()
                const retryPubkey = retryRes?.publicKey || phantom.publicKey
                if (retryPubkey) {
                  const pubkeyStr = typeof retryPubkey.toBase58 === 'function' ? retryPubkey.toBase58() : retryPubkey.toString()
                  account = {
                    address: pubkeyStr,
                    publicKey: fromBase58(pubkeyStr),
                    chains: ['solana:mainnet', 'solana:devnet'],
                    features: [SIGN_AND_SEND],
                  }
                }
              } catch (retryErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                throw new Error(cleanWalletError(retryErr, 'Phantom'))
              }
            } else {
              throw new Error(cleanWalletError(phErr, 'Phantom'))
            }
          }
        }
      }
    }

    // 2. Try standard connect feature if account not resolved yet
    if (!account && features[CONNECT]?.connect) {
      try {
        const connectInput = opts.silent ? { silent: true } : {}
        const { accounts } = await features[CONNECT].connect(connectInput)
        account = (accounts as WalletAccount[])?.find((a) => a.chains?.some((c) => c.startsWith('solana:'))) ?? accounts?.[0] ?? null
      } catch (e) {
        const err = e as WalletError
        if (opts.silent) return
        throw new Error(cleanWalletError(err, wallet.name))
      }
    }

    // 3. Fallback for Solflare
    if (!account && isSolflare) {
      const solflare = getSolflareProvider()
      if (solflare) {
        if (solflare.isConnected && solflare.publicKey) {
          const pubkeyStr = solflare.publicKey.toString()
          account = {
            address: pubkeyStr,
            publicKey: fromBase58(pubkeyStr),
            chains: ['solana:mainnet', 'solana:devnet'],
            features: [SIGN_AND_SEND],
          }
        } else {
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
            throw new Error(cleanWalletError(sfErr, 'Solflare'))
          }
        }
      }
    }

    if (!account) {
      if (opts.silent) return
      throw new Error(`The wallet did not share an account. Please check your ${wallet.name} extension popup to unlock and approve.`)
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
      const msg = cleanWalletError(e, wallet.name)
      set({ error: msg })
      throw new Error(msg)
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

  const bytes = base64ToBytes(transactionBase64)
  const targetChain = ((account.chains as readonly string[] | undefined)?.includes(chain) ? chain : account.chains?.[0] || chain) as `${string}:${string}`

  // 1. Wallet Standard signAndSendTransaction
  const features = wallet.features as Features
  if (features?.[SIGN_AND_SEND]?.signAndSendTransaction) {
    try {
      const [out] = await features[SIGN_AND_SEND].signAndSendTransaction({
        account,
        chain: targetChain,
        transaction: bytes,
      })
      if (out?.signature) {
        return typeof out.signature === 'string' ? out.signature : toBase58(out.signature as Uint8Array)
      }
    } catch (e) {
      const err = e as WalletError
      const msg = String(err?.message || err)
      if (msg.includes('User rejected') || msg.includes('User cancelled') || msg.includes('Transaction cancelled')) {
        throw new Error('Transaction cancelled in wallet')
      }
      console.warn('Wallet standard signAndSendTransaction failed, checking injected fallback:', err)
      if (!wallet.name.toLowerCase().includes('phantom') && !wallet.name.toLowerCase().includes('solflare')) {
        throw err
      }
    }
  }

  // 2. Injected Phantom fallback
  if (wallet.name.toLowerCase().includes('phantom')) {
    const phantom = getPhantomProvider()
    if (phantom?.signAndSendTransaction) {
      try {
        const txObj = await parseTransactionObject(bytes)
        const signed = await phantom.signAndSendTransaction(txObj)
        const sig = signed?.signature || signed
        return typeof sig === 'string' ? sig : toBase58(sig as Uint8Array)
      } catch (e) {
        const err = e as WalletError
        const msg = String(err?.message || err)
        if (msg.includes('User rejected') || msg.includes('User cancelled') || msg.includes('Transaction cancelled')) {
          throw new Error('Transaction cancelled in wallet')
        }
        if (msg.includes('disconnected port') || msg.includes('Attempting to use a disconnected port')) {
          throw new Error('Phantom extension connection lost. Please unlock or reload Phantom and try again.')
        }
        throw err
      }
    }
  }

  // 3. Injected Solflare fallback
  if (wallet.name.toLowerCase().includes('solflare')) {
    const solflare = getSolflareProvider()
    if (solflare?.signAndSendTransaction) {
      try {
        const txObj = await parseTransactionObject(bytes)
        const signed = await solflare.signAndSendTransaction(txObj)
        const sig = signed?.signature || signed
        return typeof sig === 'string' ? sig : toBase58(sig as Uint8Array)
      } catch (e) {
        const err = e as WalletError
        const msg = String(err?.message || err)
        if (msg.includes('User rejected') || msg.includes('User cancelled') || msg.includes('Transaction cancelled')) {
          throw new Error('Transaction cancelled in wallet')
        }
        throw err
      }
    }
  }

  throw new Error(`${wallet.name} does not support signing and sending Solana transactions`)
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
