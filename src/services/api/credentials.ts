import { local, readJSON, remove, session, writeJSON } from '@/lib/storage'

/**
 * The prepaid key (qseal_sk_…) used to pay for requests.
 *
 * By default it lives in sessionStorage (cleared when the tab closes). The
 * user can opt in to keeping it in localStorage on their own device. It is
 * never logged and is sent only as `Authorization: Bearer` to the gateway.
 */
const KEY = 'qseal.accessKey'
const listeners = new Set<() => void>()
let cached: string | null | undefined

export function getAccessKey(): string | null {
  if (cached === undefined) cached = readJSON<string | null>(session, KEY, null) ?? readJSON<string | null>(local, KEY, null)
  return cached
}

export function isRemembered(): boolean {
  return readJSON<string | null>(local, KEY, null) !== null
}

export function setAccessKey(value: string | null, opts: { remember?: boolean } = {}): void {
  remove(session, KEY)
  remove(local, KEY)
  if (value) writeJSON(opts.remember ? local : session, KEY, value)
  cached = value
  listeners.forEach((l) => l())
}

export function subscribeAccessKey(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function authHeaders(): Record<string, string> {
  const k = getAccessKey()
  return k ? { Authorization: `Bearer ${k}` } : {}
}

export const looksLikeKey = (k: string) => /^(qrouter_sk_|qseal_sk_)[a-f0-9]{32,64}$/i.test(k.trim())

export function maskKey(k: string): string {
  const trimmed = k.trim()
  return trimmed.length <= 14 ? '••••' : `${trimmed.slice(0, 14)}…${trimmed.slice(-4)}`
}
