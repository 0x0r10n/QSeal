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

/**
 * Where this path should be served instead, or null if it belongs on the current host.
 * qrouter.cloud is the marketing site; app.qrouter.cloud serves sign-in and the app (sign-in has to be on
 * the app's own domain, since wallet approval and storage are kept per domain). Other hosts (localhost,
 * previews) serve everything.
 */
export function crossDomainTarget(pathWithQuery: string): string | null {
  const path = pathWithQuery.split(/[?#]/)[0]
  // On app.qrouter.cloud, '/' itself stays and opens the app.
  const appPath = path === '/' || path === '/sign-in' || path === '/app' || path.startsWith('/app/')
  if (isAppSubdomain() && !appPath) return getMarketingUrl(pathWithQuery)
  if (isMarketingDomain() && path === '/sign-in') return getAppUrl(pathWithQuery)
  return null
}
