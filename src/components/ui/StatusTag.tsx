import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'muted'

const tones: Record<Tone, string> = {
  neutral: 'text-steel-200 border-white/12 bg-white/[0.04]',
  ok: 'text-ok border-ok/25 bg-ok/[0.07]',
  warn: 'text-warn border-warn/25 bg-warn/[0.07]',
  bad: 'text-bad border-bad/25 bg-bad/[0.07]',
  info: 'text-info border-info/25 bg-info/[0.07]',
  muted: 'text-steel-400 border-white/8 bg-transparent',
}

const dots: Record<Tone, string> = {
  neutral: 'bg-steel-200',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
  muted: 'bg-steel-500',
}

export function StatusTag({
  tone = 'neutral',
  children,
  dot = true,
  pulse = false,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em]',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dots[tone], pulse && 'animate-pulse-soft')} aria-hidden />}
      {children}
    </span>
  )
}

/** Availability labels used across marketing copy so claims stay honest. */
export type Availability = 'available' | 'deployment' | 'planned'
export function AvailabilityTag({ value, className }: { value: Availability; className?: string }) {
  const map = {
    available: { tone: 'ok' as const, label: 'Available' },
    deployment: { tone: 'warn' as const, label: 'Depends on deployment' },
    planned: { tone: 'muted' as const, label: 'Not yet confirmed' },
  }[value]
  return (
    <StatusTag tone={map.tone} className={className}>
      {map.label}
    </StatusTag>
  )
}
