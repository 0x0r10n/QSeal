import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps, type ComponentType } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { getAppUrl } from '@/lib/domains'
import { QEmblem } from '@/components/brand/QEmblem'
import { LiveFacts } from './LiveFacts'
import { useReducedMotion, useMediaQuery } from '@/hooks/useMediaQuery'
import { hasWebGL } from '@/lib/webgl'
import { DURATION, EASE } from '@/lib/motion'

// If the 3D chunk fails to load (stale deploy, flaky network), keep the static emblem instead of crashing the page.
type Scene = ComponentType<ComponentProps<typeof import('./HeroScene').default>>
const HeroScene = lazy<Scene>(() => import('./HeroScene').catch(() => ({ default: () => null })))

const HEADLINE = ['Intelligence', 'deserves', 'privacy.']

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const compact = useMediaQuery('(max-width: 767px)')
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const [inView, setInView] = useState(true)
  const [ready, setReady] = useState(false)
  const [canRender3D, setCanRender3D] = useState(false)

  // Defer WebGL until after first paint so it never blocks the initial render.
  useEffect(() => {
    if (reduced || !hasWebGL()) return
    const id = 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => setCanRender3D(true), { timeout: 900 })
      : (setTimeout(() => setCanRender3D(true), 250) as unknown as number)
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [reduced])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.86])
  const sceneOpacity = useTransform(scrollYProgress, [0.35, 0.95], [1, 0])

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      <Atmosphere />

      {/* Sculpture */}
      <motion.div
        style={{ scale: sceneScale, opacity: sceneOpacity }}
        className="pointer-events-none absolute inset-x-0 top-[8svh] -z-10 mx-auto h-[46svh] max-w-[1400px] md:inset-y-0 md:top-0 md:h-auto"
      >
        <div className="absolute inset-0 md:left-[42%]">
          {/* Static fallback — always present, cross-fades out once WebGL is ready */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: ready ? 0 : 1, scale: 1 }}
            transition={{ duration: ready ? 0.8 : DURATION.cinematic, ease: EASE }}
            className="absolute inset-0 grid place-items-center"
          >
            <QEmblem className="h-[58%] w-auto opacity-90 drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)] md:h-[50%]" />
          </motion.div>
          {canRender3D && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={{ duration: 1.2, ease: EASE }}
              className="absolute inset-0"
            >
              <Suspense fallback={null}>
                <HeroScene progress={scrollYProgress} active={inView} onReady={() => setReady(true)} compact={compact} />
              </Suspense>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-5 pb-14 pt-[55svh] sm:px-8 md:justify-center md:pb-24 md:pt-28 lg:px-12"
      >
        <div className="max-w-[640px]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 0.15 }}
            className="eyebrow mb-6 flex items-center gap-3"
          >
            <span className="h-px w-8 bg-steel-500" aria-hidden />
            Post-quantum AI inference
          </motion.p>

          <h1
            id="hero-title"
            className="text-[clamp(2.9rem,9.2vw,6.6rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-steel-50"
          >
            {HEADLINE.map((word, i) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  initial={{ y: '105%', rotate: 3 }}
                  animate={{ y: '0%', rotate: 0 }}
                  transition={{ duration: 1.25, ease: EASE, delay: 0.25 + i * 0.11 }}
                  className={`inline-block origin-bottom-left ${i === HEADLINE.length - 1 ? 'text-chrome' : ''}`}
                >
                  {word}
                  {i < HEADLINE.length - 1 && ' '}
                </motion.span>
                {i === 0 && <br className="sm:hidden" />}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 0.75 }}
            className="mt-7 max-w-[30rem] text-[17px] leading-[1.6] text-steel-300 md:text-lg"
          >
            Run AI inference through infrastructure designed for privacy, verifiable execution records, and
            post-quantum security.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 0.9 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <ButtonLink to={getAppUrl('/app')} size="lg">
              Launch App <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
            </ButtonLink>
            <ButtonLink to="/technology" variant="secondary" size="lg">
              Explore Technology <ArrowUpRight className="size-4 text-steel-400" />
            </ButtonLink>
          </motion.div>
        </div>

        <LiveFacts />
      </motion.div>

      <ScrollCue />
    </section>
  )
}

function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_40%,#1b1b20_0%,#0b0b0d_45%,#060607_80%)]" />
      <div className="pinstripes mask-radial absolute inset-0 opacity-80" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink-950" />
      <div className="absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  )
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8, duration: 1 }}
      className="pointer-events-none absolute bottom-7 right-8 hidden items-center gap-3 md:flex"
      aria-hidden
    >
      <span className="eyebrow !text-[10px]">Scroll</span>
      <span className="relative h-10 w-px overflow-hidden bg-white/10">
        <motion.span
          className="absolute inset-x-0 top-0 h-4 bg-steel-200"
          animate={{ y: ['-100%', '250%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
        />
      </span>
    </motion.div>
  )
}
