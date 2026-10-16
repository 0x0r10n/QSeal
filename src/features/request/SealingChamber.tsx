import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Circle, Loader2, Minus, X } from 'lucide-react'
import { QEmblem } from '@/components/brand/QEmblem'
import { formatMs } from '@/lib/format'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

export type Phase = 'idle' | 'sending' | 'done' | 'error' | 'cancelled'

export interface ChamberState {
  phase: Phase
  ready: boolean
  startedAt?: number
  latencyMs?: number
  httpStatus?: number
  errorTitle?: string
  receiptFound?: boolean | null
}

type StepState = 'todo' | 'active' | 'done' | 'failed' | 'skipped'

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [])
  return <>{formatMs(now - since)}</>
}

/**
 * Shows only lifecycle stages the client can actually observe. It never
 * animates signing or verification as if they happened.
 */
export function SealingChamber({ s }: { s: ChamberState }) {
  const steps: Array<{ label: string; state: StepState; detail?: React.ReactNode }> = [
    {
      label: 'Composed',
      state: s.ready || s.phase !== 'idle' ? 'done' : 'active',
      detail: s.ready || s.phase !== 'idle' ? 'Model and prompt set' : 'Choose a model and write a prompt',
    },
    {
      label: 'Dispatched',
      state: s.phase === 'idle' ? 'todo' : 'done',
      detail: s.phase !== 'idle' ? 'POST /v1/chat/completions' : undefined,
    },
    {
      label: 'Awaiting response',
      state:
        s.phase === 'sending' ? 'active' : s.phase === 'done' ? 'done' : s.phase === 'error' ? 'failed' : s.phase === 'cancelled' ? 'skipped' : 'todo',
      detail:
        s.phase === 'sending' && s.startedAt ? (
          <Elapsed since={s.startedAt} />
        ) : s.phase === 'error' ? (
          s.errorTitle
        ) : s.phase === 'cancelled' ? (
          'Cancelled'
        ) : s.latencyMs ? (
          `HTTP ${s.httpStatus} · ${formatMs(s.latencyMs)}`
        ) : undefined,
    },
    {
      label: 'Receipt',
      state: s.phase !== 'done' ? 'todo' : s.receiptFound ? 'done' : 'skipped',
      detail:
        s.phase !== 'done'
          ? undefined
          : s.receiptFound
            ? 'Receipt captured — verify it separately'
            : 'Receipt format not configured; raw response kept',
    },
  ]

  const busy = s.phase === 'sending'

  return (
    <section aria-label="Request lifecycle" className="surface-raised relative overflow-hidden rounded-2xl">
      <div className="relative grid h-44 place-items-center overflow-hidden border-b border-white/[0.07] bg-ink-950/70">
        <div aria-hidden className="pinstripes absolute inset-0 opacity-70" />
        <motion.div
          animate={busy ? { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] } : { scale: 1, opacity: s.phase === 'idle' ? 0.55 : 0.9 }}
          transition={busy ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6, ease: EASE }}
        >
          <QEmblem className="h-24 w-auto" />
        </motion.div>
        {busy && (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-12 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)]"
            animate={{ y: ['-120%', '420%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            style={{ top: 0 }}
          />
        )}
        <p className="absolute left-4 top-3 eyebrow !text-[10px]">Sealing chamber</p>
        <p className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500" aria-live="polite">
          {s.phase === 'idle' ? 'Idle' : s.phase === 'sending' ? 'In flight' : s.phase === 'done' ? 'Complete' : s.phase === 'error' ? 'Failed' : 'Cancelled'}
        </p>
      </div>
      <ol className="p-5">
        {steps.map((st, i) => (
          <li key={st.label} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span aria-hidden className={cn('absolute left-[9px] top-6 h-[calc(100%-18px)] w-px', st.state === 'done' ? 'bg-steel-400/60' : 'bg-white/[0.08]')} />
            )}
            <StepIcon state={st.state} />
            <div className="min-w-0">
              <p className={cn('text-[13.5px]', st.state === 'todo' ? 'text-steel-500' : 'text-steel-100')}>{st.label}</p>
              {st.detail && <p className="mt-0.5 truncate font-mono text-[11.5px] text-steel-500">{st.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-white/[0.06] px-5 py-3 text-[11.5px] leading-relaxed text-steel-600">
        Stages reflect what this client observed. Cryptographic checks happen only in Verify Receipt.
      </p>
    </section>
  )
}

function StepIcon({ state }: { state: StepState }) {
  const base = 'relative z-10 grid size-[19px] shrink-0 place-items-center rounded-full border'
  switch (state) {
    case 'done':
      return <span className={cn(base, 'border-steel-300 bg-steel-100 text-ink-950')}><Check className="size-3" strokeWidth={3} /></span>
    case 'active':
      return <span className={cn(base, 'border-steel-300 bg-ink-850 text-steel-100')}><Loader2 className="size-3 animate-spin" /></span>
    case 'failed':
      return <span className={cn(base, 'border-bad/50 bg-bad/15 text-bad')}><X className="size-3" strokeWidth={3} /></span>
    case 'skipped':
      return <span className={cn(base, 'border-white/15 bg-ink-850 text-steel-500')}><Minus className="size-3" /></span>
    default:
      return <span className={cn(base, 'border-white/10 bg-ink-850 text-steel-600')}><Circle className="size-1.5 fill-current text-steel-600" /></span>
  }
}
