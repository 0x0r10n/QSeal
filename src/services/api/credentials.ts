import { readJSON, remove, session, writeJSON } from '@/lib/storage'

/**
 * Optional access key supplied by the user at runtime.
 *
 * It lives in sessionStorage only (cleared when the tab closes), is never
 * logged, and is sent as a Bearer token. The backend's authentication scheme
 * has not been confirmed; adjust `authHeaders` once it is.
 */
const KEY = 'qseal.accessKey'
const listeners = new Set<() => void>()

export function getAccessKey(): string | null {
  return readJSON<string | null>(session, KEY, null)
}

export function setAccessKey(value: string | null): void {
  if (value) writeJSON(session, KEY, value)
  else remove(session, KEY)
  listeners.forEach((l) => l())
}

export function subscribeAccessKey(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function authHeaders(): Record<string, string> {
  const k = getAccessKey()
  return k ? { Authorization: `Bearer ${k}` } : {}
}

export function maskKey(k: string): string {
  return k.length <= 8 ? '••••' : `${k.slice(0, 4)}••••${k.slice(-4)}`
}
