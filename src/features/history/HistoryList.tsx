import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { HistoryEntry } from './store'
import { RequestStatusTag } from './status'
import { formatDateTime, formatMs, relativeTime } from '@/lib/format'
import { EASE } from '@/lib/motion'

export function HistoryList({ entries, compact = false }: { entries: HistoryEntry[]; compact?: boolean }) {
  return (
    <ul className="divide-y divide-white/[0.05]">
      {entries.map((e, i) => (
        <motion.li
          key={e.id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 8) * 0.03 }}
        >
          <Link
            to={`/app/history/${e.id}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_9rem_7rem_auto]"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] text-steel-100">{e.prompt || <span className="text-steel-500">(empty prompt)</span>}</p>
              <p className="mt-0.5 truncate font-mono text-[11.5px] text-steel-500">
                {e.model}
                {e.sample && ' · sample'}
              </p>
            </div>
            <div className="hidden text-[12.5px] text-steel-500 sm:block" title={formatDateTime(e.createdAt)}>
              {compact ? relativeTime(e.createdAt) : formatDateTime(e.createdAt)}
            </div>
            <div className="hidden font-mono text-[12px] text-steel-500 sm:block">{e.latencyMs ? formatMs(e.latencyMs) : '—'}</div>
            <div className="flex items-center gap-2">
              <RequestStatusTag status={e.status} />
              <ChevronRight className="size-4 text-steel-600 transition group-hover:translate-x-0.5 group-hover:text-steel-300" />
            </div>
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}
