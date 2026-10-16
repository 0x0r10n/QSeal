import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { QEmblem } from '@/components/brand/QEmblem'
import { useReducedMotion } from '@/hooks/useMediaQuery'

export function FinalCta() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const scale = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 0.8, 1])
  const rotate = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : -8, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1])

  return (
    <section ref={ref} aria-labelledby="cta-title" className="grain relative isolate overflow-hidden py-32 md:py-48">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_60%_at_50%_45%,#1d1d22,#060607_70%)]" />
      <div aria-hidden className="pinstripes mask-radial absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-4xl flex-col items-center px-5 text-center">
        <motion.div style={{ scale, rotate, opacity }}>
          <QEmblem className="h-36 w-auto drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)] md:h-48" />
        </motion.div>
        <h2 id="cta-title" className="mt-14 text-[clamp(2.4rem,6.5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-steel-50">
          Seal your next <span className="text-chrome">inference.</span>
        </h2>
        <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-steel-400">
          Open the app, pick a model, and send your first request in under a minute.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/app" size="lg">
            Launch App <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink to="/docs" size="lg" variant="secondary">
            Documentation
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
