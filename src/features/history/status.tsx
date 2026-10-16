import { StatusTag, type Tone } from '@/components/ui/StatusTag'
import type { RequestStatus } from './store'

const MAP: Record<RequestStatus, { tone: Tone; label: string }> = {
  pending: { tone: 'info', label: 'Pending' },
  completed: { tone: 'ok', label: 'Completed' },
  failed: { tone: 'bad', label: 'Failed' },
  cancelled: { tone: 'muted', label: 'Cancelled' },
}

export function RequestStatusTag({ status }: { status: RequestStatus }) {
  const m = MAP[status]
  return (
    <StatusTag tone={m.tone} pulse={status === 'pending'}>
      {m.label}
    </StatusTag>
  )
}
