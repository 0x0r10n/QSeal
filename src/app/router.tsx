import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import Home from '@/routes/marketing/Home'

type Loader = () => Promise<{ default: ComponentType }>
const loaders: Loader[] = []

/**
 * Fetch every page's code in the background once the first page is idle,
 * so later navigation never waits on a download.
 */
export function prefetchRoutes() {
  const run = () => loaders.forEach((load) => void load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}

function page(load: Loader) {
  loaders.push(load)
  const C = lazy(load)
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <C />
    </Suspense>
  )
}

// Static hosts without SPA fallback (e.g. a preview bundle) can opt into hash routing.
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

export const router = createRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/technology', element: page(() => import('@/routes/marketing/Technology')) },
      { path: '/security', element: page(() => import('@/routes/marketing/Security')) },
      { path: '/docs', element: page(() => import('@/routes/marketing/Docs')) },
      { path: '*', element: page(() => import('@/routes/NotFound')) },
    ],
  },
  // Standalone: just the sign-in card, no marketing header or footer.
  { path: '/sign-in', element: page(() => import('@/routes/marketing/SignIn')) },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: page(() => import('@/routes/app/Dashboard')) },
      { path: 'new', element: page(() => import('@/routes/app/NewRequest')) },
      { path: 'history', element: page(() => import('@/routes/app/History')) },
      { path: 'history/:id', element: page(() => import('@/routes/app/HistoryDetail')) },
      { path: 'verify', element: page(() => import('@/routes/app/Verify')) },
      { path: 'models', element: page(() => import('@/routes/app/Models')) },
      { path: 'keys', element: page(() => import('@/routes/app/Keys')) },
      { path: 'settings', element: page(() => import('@/routes/app/Settings')) },
    ],
  },
])
