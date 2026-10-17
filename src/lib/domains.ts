/**
 * Utilities for cross-subdomain routing between marketing (qrouter.cloud)
 * and the application (app.qrouter.cloud).
 */

export const DOMAINS = {
  marketing: 'qrouter.cloud',
  app: 'app.qrouter.cloud',
  api: 'api.qrouter.cloud',
} as const

export function isAppSubdomain(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host === DOMAINS.app || host.startsWith('app.')
}

export function isMarketingDomain(): boolean {
  if (typeof window === 'undefined') return true
  const host = window.location.hostname.toLowerCase()
  return host === DOMAINS.marketing || host === `www.${DOMAINS.marketing}`
}

/**
 * Returns the destination URL for the app.
 * If running on qrouter.cloud, it points to https://app.qrouter.cloud{path}.
 * In dev or local environments, it stays on the local relative path.
 */
export function getAppUrl(path = '/app'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return cleanPath

  const host = window.location.hostname.toLowerCase()
  if (host === DOMAINS.marketing || host === `www.${DOMAINS.marketing}`) {
    return `https://${DOMAINS.app}${cleanPath}`
  }

  return cleanPath
}

/**
 * Returns the destination URL for the marketing site.
 * If running on app.qrouter.cloud, it points to https://qrouter.cloud{path}.
 * In dev or local environments, it stays on the local relative path.
 */
export function getMarketingUrl(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return cleanPath

  const host = window.location.hostname.toLowerCase()
  if (host === DOMAINS.app || host.startsWith('app.')) {
    return `https://${DOMAINS.marketing}${cleanPath}`
  }

  return cleanPath
}
