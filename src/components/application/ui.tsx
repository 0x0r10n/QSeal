import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, PlugZap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { describeError } from '@/services/api/errors'

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-steel-50 sm:text-[32px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-steel-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, actions, children, className, bodyClassName }: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('surface rounded-2xl', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          {title && <h2 className="text-[13.5px] font-medium text-steel-100">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

type StateKind = 'empty' | 'loading' | 'error' | 'unconfigured'
const ICONS = { empty: Inbox, loading: Loader2, error: AlertTriangle, unconfigured: PlugZap }

export function StatePanel({ kind, title, children, action, className }: {
  kind: StateKind
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const Icon = ICONS[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}
    >
      <span
        className={cn(
          'grid size-11 place-items-center rounded-2xl border',
          kind === 'error' ? 'border-bad/25 bg-bad/[0.06] text-bad' : 'border-white/10 bg-white/[0.03] text-steel-300',
        )}
      >
        <Icon className={cn('size-5', kind === 'loading' && 'animate-spin')} strokeWidth={1.6} />
      </span>
      <p className="mt-5 font-medium text-steel-100">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-steel-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, action }: { error: unknown; action?: ReactNode }) {
  const { title, detail } = describeError(error)
  return (
    <StatePanel kind={(error as { kind?: string })?.kind === 'unconfigured' ? 'unconfigured' : 'error'} title={title} action={action}>
      {detail}
    </StatePanel>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-md bg-white/[0.05]', className)} />
}

export const fieldClass =
  'w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-steel-50 placeholder:text-steel-600 transition focus:border-white/30 focus:outline-none focus-visible:outline-none disabled:opacity-50'
