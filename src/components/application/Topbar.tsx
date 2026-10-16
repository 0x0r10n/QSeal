import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, Plus, Wallet, X } from 'lucide-react'
import { BackendStatusPill } from './BackendStatus'
import { SidebarContent } from './Sidebar'
import { APP_NAV, APP_NAV_SECONDARY } from './nav'
import { ButtonLink } from '@/components/ui/Button'
import { useAccessKey } from '@/hooks/useAccessKey'
import { maskKey } from '@/services/api/credentials'
import { EASE } from '@/lib/motion'

function useCurrentLabel() {
  const { pathname } = useLocation()
  const all = [...APP_NAV, ...APP_NAV_SECONDARY]
  const match = all
    .filter((n) => pathname === n.to || (n.to !== '/app' && pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? 'Dashboard'
}

export function Topbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const key = useAccessKey()
  const label = useCurrentLabel()
  useEffect(() => setOpen(false), [pathname])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="-ml-1 grid size-9 place-items-center rounded-lg text-steel-300 hover:bg-white/[0.05] lg:hidden"
        >
          <Menu className="size-[18px]" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
          <Link to="/app" className="hidden text-steel-500 hover:text-steel-200 sm:inline">Workspace</Link>
          <span className="hidden text-steel-600 sm:inline">/</span>
          <span className="truncate text-steel-100">{label}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <BackendStatusPill className="hidden sm:inline-flex" />
          <Link
            to="/app/settings#wallet"
            className="hidden h-8 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-steel-300 transition hover:border-white/20 hover:text-steel-50 md:inline-flex"
            title="Wallet connection is not configured for this deployment"
          >
            <Wallet className="size-3.5" />
            {key ? <span className="font-mono">{maskKey(key)}</span> : 'Wallet: not configured'}
          </Link>
          <ButtonLink to="/app/new" size="sm" className="h-8 px-3.5">
            <Plus className="size-3.5" /> <span className="hidden sm:inline">New request</span>
          </ButtonLink>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute inset-y-0 left-0 w-[280px] border-r border-white/[0.07] bg-ink-1000"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-steel-400 hover:bg-white/[0.05]"
              >
                <X className="size-4" />
              </button>
              <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} />
              <div className="absolute inset-x-4 bottom-6">
                <BackendStatusPill />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
