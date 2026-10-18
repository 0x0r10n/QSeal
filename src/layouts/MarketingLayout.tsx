import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Nav } from '@/components/marketing/Nav'
import { Footer } from '@/components/marketing/Footer'
import { EASE } from '@/lib/motion'
import { crossDomainTarget, isAppSubdomain } from '@/lib/domains'

function useScrollRestoration() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
}

export function MarketingLayout() {
  const { pathname, search, hash } = useLocation()
  useScrollRestoration()
  const elsewhere = crossDomainTarget(pathname + search + hash)
  useEffect(() => {
    if (elsewhere) window.location.replace(elsewhere)
  }, [elsewhere])
  // app.qrouter.cloud itself opens the app (AuthGuard sends signed-out visitors to sign-in).
  if (isAppSubdomain() && pathname === '/') return <Navigate to="/app" replace />
  if (elsewhere) return null
  return (
    <div className="relative min-h-dvh bg-ink-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-steel-50 focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Skip to content
      </a>
      <Nav />
      <motion.main
        id="main"
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  )
}
