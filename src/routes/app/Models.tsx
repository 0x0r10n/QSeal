import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, Boxes, RefreshCw, Search } from 'lucide-react'
import { ErrorState, PageHeader, Panel, Skeleton, StatePanel, fieldClass } from '@/components/application/ui'
import { Button } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { useModels } from '@/hooks/useModels'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

export default function Models() {
  useDocumentTitle('Models')
  const q = useModels()
  const [needle, setNeedle] = useState('')
  const list = useMemo(() => (q.data ?? []).filter((m) => m.id.toLowerCase().includes(needle.trim().toLowerCase())), [q.data, needle])

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Models"
        description={<>Served live from <code className="font-mono text-[13px] text-steel-300">GET /v1/models</code>. Nothing on this page is hard-coded.</>}
        actions={
          backendMode !== 'unconfigured' && (
            <Button variant="secondary" size="sm" onClick={() => void q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={cn('size-3.5', q.isFetching && 'animate-spin')} /> Refresh
            </Button>
          )
        }
      />

      <Panel bodyClassName="p-0">
        {backendMode === 'unconfigured' ? (
          <StatePanel kind="unconfigured" title="No backend configured">
            Set <code className="font-mono">VITE_QSEAL_API_URL</code> to load the model catalogue.
          </StatePanel>
        ) : q.isPending ? (
          <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 bg-ink-850 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState error={q.error} action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>} />
        ) : q.data.length === 0 ? (
          <StatePanel kind="empty" title="No models available">The backend responded with an empty catalogue.</StatePanel>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-white/[0.06] p-3">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
                <label htmlFor="msearch" className="sr-only">Filter models</label>
                <input id="msearch" value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Filter models" className={cn(fieldClass, 'h-9 pl-9')} />
              </div>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-steel-500">
                {list.length} / {q.data.length}
              </span>
              {backendMode === 'mock' && <StatusTag tone="warn">Sample</StatusTag>}
            </div>
            {list.length === 0 ? (
              <StatePanel kind="empty" title="No matches" />
            ) : (
              <ul className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
                {list.map((m, i) => (
                  <motion.li
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 12) * 0.025 }}
                    className="group bg-ink-850 p-5 transition-colors hover:bg-ink-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                        <Boxes className="size-4 text-steel-400" strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] text-steel-50" title={m.id}>{m.id}</p>
                        <p className="mt-1 text-[12px] text-steel-500">
                          {m.ownedBy ?? 'Owner not reported'}
                          {m.created ? ` · ${new Date(m.created * 1000).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/app/new"
                      className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-steel-400 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Use in a request <ArrowUpRight className="size-3.5" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        )}
      </Panel>
    </>
  )
}
