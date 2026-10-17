import { Check, Minus } from 'lucide-react'
import { PageHero, Prose } from '@/components/marketing/PageHero'
import { Container } from '@/components/marketing/SectionHeader'
import { AvailabilityTag } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { SECURITY_LAYERS } from '@/content/security'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const NOT_CLAIMED = [
  'End-to-end encryption all the way to the model',
  'That model providers never see or store prompts',
  'Hardware trusted execution or remote attestation',
  'Zero-knowledge proofs of inference, or that answers are correct',
  'Post-quantum security for Solana wallet signatures',
]

export default function Security() {
  useDocumentTitle('Security')
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={
          <>
            Precise claims. <span className="text-steel-500">Nothing implied.</span>
          </>
        }
        lede="Security is a set of specific properties with specific boundaries. Here is each layer of QRouter, what it protects, and what it does not."
      />

      <Container className="py-20 md:py-28">
        <Reveal as="ol" className="grid gap-4" gap={0.08}>
          {SECURITY_LAYERS.map((l, i) => (
            <RevealItem as="li" key={l.id} id={l.id} className="surface scroll-mt-24 rounded-3xl p-7 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-xs text-steel-600">0{i + 1}</span>
                  <h2 className="text-2xl font-medium tracking-[-0.03em] text-steel-50 md:text-[28px]">{l.name}</h2>
                </div>
                <AvailabilityTag value={l.status} />
              </div>
              <div className="mt-8 grid gap-8 md:grid-cols-2 md:pl-10">
                <div>
                  <p className="eyebrow mb-3 flex items-center gap-2 !text-steel-300">
                    <Check className="size-3.5" /> Covers
                  </p>
                  <p className="leading-[1.75] text-steel-300">{l.covers}</p>
                </div>
                <div>
                  <p className="eyebrow mb-3 flex items-center gap-2">
                    <Minus className="size-3.5" /> Does not claim
                  </p>
                  <p className="leading-[1.75] text-steel-500">{l.notClaimed}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </Reveal>

        <div className="mt-20">
          <Prose title="Explicitly not claimed">
            <p>QRouter does not claim any of the following:</p>
            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {NOT_CLAIMED.map((c) => (
                <li key={c} className="flex items-center gap-4 py-3.5 text-steel-300">
                  <Minus className="size-4 text-steel-600" /> {c}
                </li>
              ))}
            </ul>
          </Prose>
          <Prose title="Why wallets are a separate layer">
            <p>
              Solana accounts are secured by Ed25519 signatures, a classical scheme. QRouter uses wallets to establish identity and to
              settle payments. That is a different job from protecting the integrity of inference records, which is where QRouter’s
              post-quantum design applies. Keeping the layers separate keeps each claim honest.
            </p>
          </Prose>
          <Prose title="This web application">
            <p>
              The gateway keeps no prompts or completions, so your request history lives only in this browser. A prepaid key is kept
              for the current tab unless you choose to remember it on your device, and it is only ever sent to the gateway. Receipts
              are shown as valid only after their signatures have been checked in your browser against the gateway’s published keys.
            </p>
          </Prose>
          <Prose title="Reporting a vulnerability">
            <p>A security contact is published with each production deployment. Please use that channel for coordinated disclosure.</p>
          </Prose>
        </div>
      </Container>
    </>
  )
}
