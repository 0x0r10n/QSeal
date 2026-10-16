import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

export interface AccordionItem {
  q: string
  a: ReactNode
  meta?: ReactNode
}

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  return (
    <div className={cn('divide-y divide-white/[0.07] border-y border-white/[0.07]', className)}>
      {items.map((item, i) => {
        const isOpen = open === i
        const panelId = `${base}-p${i}`
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center gap-6 py-6 text-left"
              >
                <span className="font-mono text-[11px] text-steel-600 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-[17px] font-medium tracking-[-0.015em] text-steel-100 transition group-hover:text-white md:text-lg">
                  {item.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-steel-300 group-hover:border-white/25"
                >
                  <Plus className="size-4" />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="pb-7 pl-[2.6rem] pr-12 text-[15px] leading-relaxed text-steel-400">
                    {item.meta && <div className="mb-3">{item.meta}</div>}
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
