/** Defensive wrappers — storage can throw in private windows or be blocked. */
export function readJSON<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(store: Storage | undefined, key: string, value: unknown): void {
  try {
    store?.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or blocked — non-critical */
  }
}

export function remove(store: Storage | undefined, key: string): void {
  try {
    store?.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const local = typeof window !== 'undefined' ? window.localStorage : undefined
export const session = typeof window !== 'undefined' ? window.sessionStorage : undefined
