import { useMemo, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Container, SectionHeader } from './SectionHeader'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useReducedMotion } from '@/hooks/useMediaQuery'

const POINTS = [
  {
    title: 'Prompts are disclosures',
    body: 'Source code, contracts, clinical notes, an agent’s private plans. Every inference request carries context that leaves your boundary and lands on infrastructure you do not operate.',
  },
  {
    title: 'Answers arrive without evidence',
    body: 'A conventional API returns text, not a record. There is rarely a portable, checkable artefact showing which model answered, and when.',
  },
  {
    title: 'Captured today, read tomorrow',
    body: 'Traffic recorded under classical key exchange may be decrypted once large quantum computers exist. NIST published its first post-quantum standards in 2024 so that long-lived data can be protected now.',
  },
]

const GLYPHS = '▚▞▙▟▛▜░▒▓◆◇◈⌬⌖'
const PLAIN = 'messages[0].content = "Summarise the merger terms in the attached draft."'

function scramble(seed: number, len: number) {
  let s = ''
  for (let i = 0; i < len; i++) {
    const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453
    s += PLAIN[i] === ' ' ? ' ' : GLYPHS[Math.floor((x - Math.floor(x)) * GLYPHS.length)]
  }
  return s
}

function CipherLine({ revealed, label, sub, sealed }: { revealed: number; label: string; sub: string; sealed?: boolean }) {
  const cut = Math.floor(revealed * PLAIN.length)
  const noise = useMemo(() => scramble(sealed ? Math.floor(revealed * 12) : 1, PLAIN.length), [revealed, sealed])
  return (
    <div className="border-t border-white/[0.07] py-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-steel-100">{label}</span>
        <span className="eyebrow !text-[10px]">{sub}</span>
      </div>
      <p className="mt-4 break-all font-mono text-[12.5px] leading-relaxed sm:text-[13px]" aria-hidden>
        {sealed ? (
          <span className="text-steel-500">{noise}</span>
        ) : (
          <>
            <span className="text-steel-100">{PLAIN.slice(0, cut)}</span>
            <span className="text-steel-600">{noise.slice(cut)}</span>
          </>
        )}
      </p>
    </div>
  )
}

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 40%'] })
  // Quantised to whole characters so scrolling re-renders only when the text changes.
  const steps = PLAIN.length
  const [step, setStep] = useState(reduced ? steps : 0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduced) return
    const next = Math.round(Math.min(1, Math.max(0, v)) * steps)
    setStep((cur) => (cur === next ? cur : next))
  })
  const p = step / steps

  return (
    <section aria-labelledby="problem-title" className="relative py-28 md:py-40">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeader
              index="01"
              eyebrow="The problem"
              titleId="problem-title"
              title={
                <>
                  An inference is a <span className="text-steel-500">disclosure.</span>
                </>
              }
              lede="AI is becoming the place where sensitive work happens. The infrastructure underneath it was not designed to keep that work private for decades, or to prove what took place."
            />

            {/* Illustration: harvest-now, decrypt-later */}
            <div ref={ref} className="mt-14 rounded-2xl border border-white/[0.07] bg-ink-900/60 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Harvest now · decrypt later</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-steel-600">Illustration</span>
              </div>
              <div className="relative mt-6 h-px bg-white/[0.08]">
                <motion.div className="absolute inset-y-0 left-0 w-full origin-left bg-steel-200" style={{ scaleX: reduced ? 1 : scrollYProgress }} />
                <div className="absolute -top-6 left-0 font-mono text-[10px] text-steel-500">Captured</div>
                <div className="absolute -top-6 right-0 font-mono text-[10px] text-steel-500">Future adversary</div>
              </div>
              <div className="mt-6">
                <CipherLine revealed={p} label="Classical key exchange" sub={p > 0.98 ? 'Exposed' : 'Decrypting'} />
                <CipherLine revealed={p} label="Post-quantum key establishment" sub="Designed to stay sealed" sealed />
              </div>
            </div>
          </div>

          <Reveal className="flex flex-col" gap={0.12}>
            {POINTS.map((pt, i) => (
              <RevealItem key={pt.title} className="group border-t border-white/[0.07] py-10 first:border-t-0 first:pt-2 lg:py-14">
                <div className="flex gap-6 sm:gap-10">
                  <span className="font-mono text-sm tabular-nums text-steel-600">0{i + 1}</span>
                  <div>
                    <h3 className="text-2xl font-medium tracking-[-0.03em] text-steel-50 md:text-[1.75rem]">{pt.title}</h3>
                    <p className="mt-4 max-w-md text-[15.5px] leading-[1.7] text-steel-400">{pt.body}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
