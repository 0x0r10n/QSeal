import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { PageHeader, Panel, StatePanel, fieldClass } from '@/components/application/ui'
import { Button, ButtonLink } from '@/components/ui/Button'
import { HistoryList } from '@/features/history/HistoryList'
import { historyStore, useHistory, type RequestStatus } from '@/features/history/store'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { backendMode } from '@/lib/env'
import { cn } from '@/lib/cn'

const FILTERS: Array<{ id: 'all' | RequestStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function History() {
  useDocumentTitle('History')
  const all = useHistory()
  const entries = useMemo(() => all.filter((e) => !e.sample || backendMode === 'mock'), [all])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) => (filter === 'all' || e.status === filter) && (!needle || e.prompt.toLowerCase().includes(needle) || e.model.toLowerCase().includes(needle)),
    )
  }, [entries, filter, q])

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="History"
        description="Requests sent from this browser. The backend’s account-level history is not connected, so nothing here comes from other devices."
        actions={
          entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Clear all local request history? This cannot be undone.')) historyStore.clear()
              }}
            >
              <Trash2 className="size-3.5" /> Clear local history
            </Button>
          )
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3 sm:flex-row sm:items-center">
          <div role="group" aria-label="Filter by status" className="scrollbar-thin flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const count = f.id === 'all' ? entries.length : entries.filter((e) => e.status === f.id).length
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition',
                    filter === f.id ? 'bg-white/[0.08] text-steel-50' : 'text-steel-400 hover:text-steel-100',
                  )}
                >
                  {f.label}
                  <span className="font-mono text-[10.5px] text-steel-500">{count}</span>
                </button>
              )
            })}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
            <label htmlFor="hsearch" className="sr-only">Search history</label>
            <input id="hsearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts or models" className={cn(fieldClass, 'h-9 pl-9')} />
          </div>
        </div>

        {entries.length === 0 ? (
          <StatePanel kind="empty" title="No requests yet" action={<ButtonLink to="/app/new" size="sm">New request</ButtonLink>}>
            When you send a request from this browser, it is recorded here with its status and response.
          </StatePanel>
        ) : shown.length === 0 ? (
          <StatePanel kind="empty" title="No matches">Try a different filter or search term.</StatePanel>
        ) : (
          <HistoryList entries={shown} />
        )}
      </Panel>
    </>
  )
}
