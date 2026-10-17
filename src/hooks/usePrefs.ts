import { useSyncExternalStore } from 'react'
import { local, readJSON, writeJSON } from '@/lib/storage'

export interface Prefs {
  motion: 'system' | 'reduced' | 'full'
  sidebarCollapsed: boolean
}

const KEY = 'qrouter.prefs.v1'
const LEGACY_KEY = 'qseal.prefs.v1'
const DEFAULTS: Prefs = { motion: 'system', sidebarCollapsed: false }
let prefs: Prefs = {
  ...DEFAULTS,
  ...readJSON<Partial<Prefs> | null>(local, KEY, null),
  ...readJSON<Partial<Prefs>>(local, LEGACY_KEY, {}),
}
const listeners = new Set<() => void>()

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch }
  writeJSON(local, KEY, prefs)
  listeners.forEach((l) => l())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => prefs, () => DEFAULTS)
}
