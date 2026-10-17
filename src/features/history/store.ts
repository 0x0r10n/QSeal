import { useSyncExternalStore } from 'react'
import { local, readJSON, writeJSON } from '@/lib/storage'
import type { QSealReceipt } from '@/types/api'

/**
 * Request history recorded by THIS browser. The gateway keeps no prompts or
 * completions (zero retention), so this local log is the only copy: requests
 * the user actually sent from here, with their signed receipts.
 */
export type RequestStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface HistoryEntry {
  id: string
  createdAt: number
  model: string
  prompt: string
  system?: string
  status: RequestStatus
  responseText?: string | null
  responseRaw?: unknown
  responseId?: string
  httpStatus?: number
  latencyMs?: number
  error?: { title: string; detail: string }
  receipt?: QSealReceipt | null
  receiptCheck?: 'valid' | 'invalid' | 'unable'
  sealed?: boolean
  payment?: 'key' | 'wallet' | 'trial'
  paymentSignature?: string
  priceUsdc?: number
  sample?: boolean
}

const KEY = 'qseal.history.v1'
const MAX = 200
let cache: HistoryEntry[] = readJSON<HistoryEntry[]>(local, KEY, [])
const listeners = new Set<() => void>()

function emit() {
  writeJSON(local, KEY, cache)
  listeners.forEach((l) => l())
}

export const historyStore = {
  all: () => cache,
  get: (id: string) => cache.find((e) => e.id === id),
  add(entry: HistoryEntry) {
    cache = [entry, ...cache].slice(0, MAX)
    emit()
  },
  update(id: string, patch: Partial<HistoryEntry>) {
    cache = cache.map((e) => (e.id === id ? { ...e, ...patch } : e))
    emit()
  },
  remove(id: string) {
    cache = cache.filter((e) => e.id !== id)
    emit()
  },
  clear() {
    cache = []
    emit()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = readJSON<HistoryEntry[]>(local, KEY, [])
      listeners.forEach((l) => l())
    }
  })
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(historyStore.subscribe, historyStore.all, historyStore.all)
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
