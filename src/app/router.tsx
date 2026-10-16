import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { AppLayout } from '@/layouts/AppLayout'
import Home from '@/routes/marketing/Home'

function page(load: () => Promise<{ default: ComponentType }>) {
  const C = lazy(load)
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <C />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/technology', element: page(() => import('@/routes/marketing/Technology')) },
      { path: '/security', element: page(() => import('@/routes/marketing/Security')) },
      { path: '/docs', element: page(() => import('@/routes/marketing/Docs')) },
      { path: '/sign-in', element: page(() => import('@/routes/marketing/SignIn')) },
      { path: '*', element: page(() => import('@/routes/NotFound')) },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
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
