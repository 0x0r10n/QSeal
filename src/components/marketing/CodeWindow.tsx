import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { SNIPPETS } from '@/content/snippets'
import { QEmblem } from '@/components/brand/QEmblem'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

export function CodeWindow({ className }: { className?: string }) {
  const [tab, setTab] = useState(SNIPPETS[0].id)
  const current = SNIPPETS.find((s) => s.id === tab)!
  return (
    <div className={cn('surface-raised overflow-hidden rounded-2xl', className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5 sm:px-4">
        <QEmblem className="mr-1 h-4 w-auto opacity-80" detail="mark" />
        <div role="tablist" aria-label="Language" className="flex gap-1 overflow-x-auto">
          {SNIPPETS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={tab === s.id}
              onClick={() => setTab(s.id)}
              className={cn(
                'relative rounded-full px-3 py-1.5 text-xs transition-colors',
                tab === s.id ? 'text-steel-50' : 'text-steel-500 hover:text-steel-200',
              )}
            >
              {tab === s.id && (
                <motion.span layoutId="code-tab" className="absolute inset-0 rounded-full bg-white/[0.07]" transition={{ duration: 0.4, ease: EASE }} />
              )}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-steel-400 sm:inline">
            OpenAI-compatible
          </span>
          <CopyButton value={current.code} />
        </div>
      </div>
      <div className="relative min-h-[300px] bg-ink-950/60 p-4 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            aria-label={`${current.label} example`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <Code code={current.code} lang={current.lang} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 font-mono text-[10.5px] text-steel-600">
        <span>{current.file}</span>
        <span className="hidden sm:inline">Set QROUTER_API_URL and key, then run</span>
      </div>
    </div>
  )
}
