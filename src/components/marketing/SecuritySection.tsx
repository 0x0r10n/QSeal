import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Container, SectionHeader } from './SectionHeader'
import { LayerStack } from './LayerStack'
import { AvailabilityTag } from '@/components/ui/StatusTag'
import { SECURITY_LAYERS } from '@/content/security'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

export function SecuritySection() {
  const [active, setActive] = useState(0)
  const items = useRef<Array<HTMLLIElement | null>>([])

  // On large screens the active layer follows scroll position.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    items.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section aria-labelledby="security-title" className="relative overflow-x-clip py-28 md:py-40">
      <Container>
        <SectionHeader
          index="03"
          eyebrow="Security architecture"
          titleId="security-title"
          title={
            <>
              Five layers. <span className="text-steel-500">Each with a clear boundary.</span>
            </>
          }
          lede="Security claims are only useful when they are precise. Every layer below states what it protects — and what it does not."
        />

        <div className="mt-20 grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:h-[calc(100svh-10rem)] lg:self-start">
            <div className="flex h-full items-center">
              <LayerStack count={SECURITY_LAYERS.length} active={active} labels={SECURITY_LAYERS.map((l) => l.id)} />
            </div>
          </div>

          <ol className="flex flex-col">
            {SECURITY_LAYERS.map((layer, i) => {
              const isActive = active === i
              return (
                <li
                  key={layer.id}
                  data-index={i}
                  ref={(el) => {
                    items.current[i] = el
                  }}
                  className="border-t border-white/[0.07] last:border-b lg:min-h-[32vh] lg:py-6"
                >
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={isActive}
                    className="flex w-full items-start gap-5 py-7 text-left lg:pointer-events-none lg:py-4"
                  >
                    <span className={cn('mt-1.5 font-mono text-xs tabular-nums transition-colors', isActive ? 'text-steel-100' : 'text-steel-600')}>
                      0{i + 1}
                    </span>
                    <span className="flex-1">
                      <span
                        className={cn(
                          'block text-[22px] font-medium tracking-[-0.03em] transition-colors duration-500 md:text-[26px]',
                          isActive ? 'text-steel-50' : 'text-steel-500',
                        )}
                      >
                        {layer.name}
                      </span>
                      <span className="mt-1.5 block text-[15px] text-steel-500">{layer.short}</span>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {(isActive || typeof window === 'undefined') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-6 pb-9 pl-9 sm:grid-cols-2">
                          <div>
                            <p className="eyebrow mb-3 flex items-center gap-2 !text-steel-300">
                              <Check className="size-3.5" /> Covers
                            </p>
                            <p className="text-[14.5px] leading-[1.7] text-steel-300">{layer.covers}</p>
                          </div>
                          <div>
                            <p className="eyebrow mb-3 flex items-center gap-2">
                              <Minus className="size-3.5" /> Does not claim
                            </p>
                            <p className="text-[14.5px] leading-[1.7] text-steel-500">{layer.notClaimed}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <AvailabilityTag value={layer.status} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-14">
          <Link to="/security" className="group inline-flex items-center gap-2 text-sm text-steel-200 hover:text-white">
            Read the full security model
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  )
}
