/** Runtime configuration, read once from Vite env. Nothing secret lives here. */
function normaliseUrl(raw: string | undefined): string | null {
  const v = raw?.trim()
  if (!v) return null
  try {
    // "/" (or any path) means the gateway serves this app from the same origin.
    const u = v.startsWith('/') && typeof window !== 'undefined' ? new URL(v, window.location.origin) : new URL(v)
    return u.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

const rawUrl = import.meta.env.VITE_QSEAL_API_URL as string | undefined

export const env = {
  apiUrl: normaliseUrl(rawUrl),
  /** True when a value was supplied but could not be parsed as a URL. */
  apiUrlInvalid: Boolean(rawUrl?.trim()) && normaliseUrl(rawUrl) === null,
  timeoutMs: Number(import.meta.env.VITE_QSEAL_API_TIMEOUT_MS) || 120_000,
  /** Sample data is only ever possible in dev builds. */
  devMocks: import.meta.env.DEV && import.meta.env.VITE_QSEAL_DEV_MOCKS === 'true',
  isDev: import.meta.env.DEV,
} as const

export type BackendMode = 'live' | 'mock' | 'unconfigured'

export const backendMode: BackendMode = env.apiUrl ? 'live' : env.devMocks ? 'mock' : 'unconfigured'
