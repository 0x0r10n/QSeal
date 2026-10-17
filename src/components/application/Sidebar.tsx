import { Link, NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { QEmblem } from '@/components/brand/QEmblem'
import { APP_NAV, APP_NAV_SECONDARY } from './nav'
import { setPrefs, usePrefs } from '@/hooks/usePrefs'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

function Item({ to, label, icon: Icon, end, collapsed, onNavigate }: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  end?: boolean
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors',
          isActive ? 'text-steel-50' : 'text-steel-400 hover:bg-white/[0.035] hover:text-steel-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg border border-white/[0.08] bg-white/[0.06]"
              transition={{ duration: 0.35, ease: EASE }}
            />
          )}
          <Icon className="relative size-[17px] shrink-0" strokeWidth={1.6} />
          <span className={cn('relative truncate transition-opacity', collapsed && 'lg:sr-only')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 items-center px-4', collapsed && 'lg:justify-center lg:px-0')}>
        <Link to="/" className="flex items-center gap-2.5 rounded-md" aria-label="QRouter home">
          <QEmblem className="h-[22px] w-auto" detail="mark" />
          <span className={cn('text-[15px] font-semibold tracking-[-0.02em] text-steel-50', collapsed && 'lg:hidden')}>QRouter</span>
        </Link>
      </div>
      <nav aria-label="Application" className="flex flex-1 flex-col gap-0.5 px-2.5 pt-3">
        {APP_NAV.map((n) => (
          <Item key={n.to} {...n} end={'end' in n ? n.end : false} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        <div className="my-3 h-px bg-white/[0.06]" />
        {APP_NAV_SECONDARY.map((n) => (
          <Item key={n.to} {...n} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed } = usePrefs()
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 236 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/[0.06] bg-ink-1000 lg:flex"
    >
      <SidebarContent collapsed={collapsed} />
      <div className={cn('border-t border-white/[0.06] p-2.5', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={() => setPrefs({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] text-steel-500 transition hover:bg-white/[0.04] hover:text-steel-100"
        >
          {collapsed ? <PanelLeftOpen className="size-[17px]" strokeWidth={1.6} /> : <PanelLeftClose className="size-[17px]" strokeWidth={1.6} />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </motion.aside>
  )
}
