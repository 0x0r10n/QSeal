import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { FileSignature, Cpu, ScanLine, Send } from 'lucide-react'
import { Container, SectionHeader } from './SectionHeader'
import { AvailabilityTag, type Availability } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useReducedMotion } from '@/hooks/useMediaQuery'

const STEPS: Array<{ title: string; body: string; icon: typeof Send; status: Availability; code: string }> = [
  {
    title: 'Request',
    body: 'Your app or agent calls the OpenAI-compatible endpoint, optionally sealing the prompt with ML-KEM-768, and pays with a prepaid key or an x402 USDC transfer.',
    icon: Send,
    status: 'available',
    code: 'POST /v1/chat/completions',
  },
  {
    title: 'Processing',
    body: 'The gateway checks payment, unseals the prompt in memory, runs it on the selected model, and keeps no copy of either side.',
    icon: Cpu,
    status: 'available',
    code: 'model → completion',
  },
  {
    title: 'Signed receipt',
    body: 'The answer comes back with a receipt signed with ML-DSA-65 and Ed25519 over hashes of the prompt and the response.',
    icon: FileSignature,
    status: 'available',
    code: 'qseal_receipt',
  },
  {
    title: 'Verification',
    body: 'Anyone holding the receipt can check it against QRouter’s published keys, in the app, through the API, or offline.',
    icon: ScanLine,
    status: 'available',
    code: '/.well-known/qseal-keys.json',
  },
]

export function FlowSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] })
  const fill = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), { stiffness: 90, damping: 24 })

  return (
    <section aria-labelledby="flow-title" className="relative overflow-hidden border-t border-white/[0.05] bg-ink-1000 py-28 md:py-40">
      <div aria-hidden className="fine-grid mask-radial pointer-events-none absolute inset-0 opacity-60" />
      <Container className="relative">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            index="02"
            eyebrow="How QRouter works"
            titleId="flow-title"
            title={
              <>
                From prompt to <span className="text-chrome">proof.</span>
              </>
            }
            lede="Four stages, one lifecycle. Each response can travel with a signed record of the execution that produced it."
          />
          <p className="max-w-[16rem] font-mono text-[11px] leading-relaxed text-steel-500">
            Every stage runs in the app today. The Security page lists what each one does and does not guarantee.
          </p>
        </div>

        <div ref={ref} className="relative mt-20">
          {/* Track — horizontal on desktop, vertical on mobile */}
          <div aria-hidden className="absolute left-[19px] top-0 h-full w-px bg-white/[0.08] lg:left-0 lg:top-[19px] lg:h-px lg:w-full">
            <motion.div
              style={{ scaleX: reduced ? 1 : fill, transformOrigin: '0 50%' }}
              className="absolute inset-0 hidden bg-gradient-to-r from-steel-500 via-steel-100 to-steel-400 lg:block"
            />
            <motion.div
              style={{ scaleY: reduced ? 1 : fill, transformOrigin: '50% 0' }}
              className="absolute inset-0 bg-gradient-to-b from-steel-500 via-steel-100 to-steel-400 lg:hidden"
            />
            {!reduced && (
              <div className="absolute inset-0 hidden overflow-hidden lg:block">
                <span className="animate-travel absolute inset-y-[-2px] left-0 w-1/4 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)] blur-[1px]" />
              </div>
            )}
          </div>

          <Reveal as="ol" className="relative grid gap-12 lg:grid-cols-4 lg:gap-8" gap={0.14}>
            {STEPS.map((s, i) => (
              <RevealItem as="li" key={s.title} className="relative pl-14 lg:pl-0 lg:pt-16">
                <div className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-white/15 bg-ink-850 shadow-[0_0_0_6px_var(--color-ink-1000)]">
                  <s.icon className="size-4 text-steel-100" strokeWidth={1.6} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-steel-600">0{i + 1}</span>
                  <h3 className="text-xl font-medium tracking-[-0.025em] text-steel-50">{s.title}</h3>
                </div>
                <p className="mt-3 max-w-xs text-[15px] leading-[1.65] text-steel-400">{s.body}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <code className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[11px] text-steel-300">
                    {s.code}
                  </code>
                  <AvailabilityTag value={s.status} />
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
