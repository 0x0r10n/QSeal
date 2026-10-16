import { useBackendStatus } from '@/hooks/useModels'
import { StatusTag, type Tone } from '@/components/ui/StatusTag'

const MAP: Record<ReturnType<typeof useBackendStatus>['status'], { tone: Tone; label: string; pulse?: boolean }> = {
  unconfigured: { tone: 'muted', label: 'Not configured' },
  checking: { tone: 'info', label: 'Checking', pulse: true },
  online: { tone: 'ok', label: 'API reachable', pulse: true },
  unreachable: { tone: 'bad', label: 'Unreachable' },
  sample: { tone: 'warn', label: 'Sample data' },
}

export function BackendStatusPill({ className }: { className?: string }) {
  const { status } = useBackendStatus()
  const m = MAP[status]
  return (
    <span role="status" aria-label={`Network status: ${m.label}`}>
      <StatusTag tone={m.tone} pulse={m.pulse} className={className}>
        {m.label}
      </StatusTag>
    </span>
  )
}
