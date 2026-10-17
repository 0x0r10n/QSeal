import { ArrowRight, BookOpen } from 'lucide-react'
import { Container, SectionHeader } from './SectionHeader'
import { CodeWindow } from './CodeWindow'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal, RevealItem } from '@/components/ui/Reveal'

const STEPS = [
  ['Get access', 'Connect a Solana wallet or use a prepaid key.'],
  ['Point your client', 'Use the QRouter base URL with any OpenAI-compatible client.'],
  ['Keep the receipt', 'Store the signed receipt next to the response for later verification.'],
]

export function DeveloperSection() {
  return (
    <section aria-labelledby="dev-title" className="relative overflow-hidden border-y border-white/[0.05] bg-ink-1000 py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-20 size-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_65%)]" />
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 [&>*]:min-w-0">
          <div>
            <SectionHeader
              index="04"
              eyebrow="Developer experience"
              titleId="dev-title"
              title={
                <>
                  Familiar API. <span className="text-steel-500">Stronger guarantees.</span>
                </>
              }
              lede="If your code already speaks the OpenAI chat-completions dialect, it is a base-URL change away from QRouter."
            />
            <Reveal as="ol" className="mt-12 space-y-0" gap={0.1}>
              {STEPS.map(([t, b], i) => (
                <RevealItem as="li" key={t} className="flex gap-5 border-t border-white/[0.07] py-5">
                  <span className="mt-0.5 font-mono text-xs text-steel-600">0{i + 1}</span>
                  <div>
                    <p className="font-medium text-steel-100">{t}</p>
                    <p className="mt-1 text-[14.5px] text-steel-500">{b}</p>
                  </div>
                </RevealItem>
              ))}
            </Reveal>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to="/app">
                Launch App <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink to="/docs" variant="secondary">
                <BookOpen className="size-4 text-steel-400" /> Read the docs
              </ButtonLink>
            </div>
          </div>
          <Reveal>
            <RevealItem>
              <CodeWindow />
            </RevealItem>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
