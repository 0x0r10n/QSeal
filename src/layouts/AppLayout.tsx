import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sidebar } from '@/components/application/Sidebar'
import { Topbar } from '@/components/application/Topbar'
import { ConfigBanner } from '@/components/application/ConfigBanner'
import { EASE } from '@/lib/motion'

export function AppLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh bg-ink-950">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-steel-50 focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <ConfigBanner />
        <motion.main
          id="app-main"
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  )
}
