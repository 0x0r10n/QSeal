import { ArrowRight } from 'lucide-react'
import { PageHero, Prose } from '@/components/marketing/PageHero'
import { ArchitectureDiagram } from '@/components/marketing/ArchitectureDiagram'
import { Container } from '@/components/marketing/SectionHeader'
import { CodeWindow } from '@/components/marketing/CodeWindow'
import { ButtonLink } from '@/components/ui/Button'
import { AvailabilityTag } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const STANDARDS = [
  { id: 'FIPS 203', name: 'ML-KEM', role: 'Key encapsulation', href: 'https://csrc.nist.gov/pubs/fips/203/final' },
  { id: 'FIPS 204', name: 'ML-DSA', role: 'Lattice-based signatures', href: 'https://csrc.nist.gov/pubs/fips/204/final' },
  { id: 'FIPS 205', name: 'SLH-DSA', role: 'Hash-based signatures', href: 'https://csrc.nist.gov/pubs/fips/205/final' },
]

export default function Technology() {
  useDocumentTitle('Technology')
  return (
    <>
      <PageHero
        eyebrow="Technology"
        title={
          <>
            Infrastructure for inference <span className="text-steel-500">you can account for.</span>
          </>
        }
        lede="QSeal combines an OpenAI-compatible inference API with signed execution receipts and a cryptographic design aimed at the post-quantum era."
      >
        <ButtonLink to="/app">
          Launch App <ArrowRight className="size-4" />
        </ButtonLink>
      </PageHero>

      <Container className="py-20 md:py-28">
        <Reveal>
          <RevealItem>
            <ArchitectureDiagram />
          </RevealItem>
        </Reveal>

        <div className="mt-20">
          <Prose title="API surface" aside={<AvailabilityTag value="available" />}>
            <p>
              QSeal exposes endpoints shaped like the OpenAI API, so existing SDKs and agent frameworks work by changing the base URL.
              The two contracts this frontend integrates with are <code className="text-steel-200">GET /v1/models</code> and{' '}
              <code className="text-steel-200">POST /v1/chat/completions</code>.
            </p>
            <p>Additional endpoints — history, receipt verification, key management — are documented with each deployment.</p>
          </Prose>

          <Prose title="Request lifecycle" aside={<AvailabilityTag value="available" />}>
            <p>
              A request names a model and a list of messages. QSeal runs the inference on that model, returns the completion, and issues
              a receipt for the execution. The web app shows each stage as it actually happens — it never animates a step the server did
              not perform.
            </p>
          </Prose>

          <Prose title="Receipts" aside={<AvailabilityTag value="available" />}>
            <p>
              A receipt is a signed record you keep alongside a response. Because it is signed, it can be checked later — by you, an
              auditor, or another agent — against QSeal’s published verification key, without trusting the channel it travelled over.
            </p>
            <p>The receipt format and verification procedure are defined in the API reference for your deployment.</p>
          </Prose>

          <Prose title="Post-quantum primitives" aside={<AvailabilityTag value="deployment" />}>
            <p>
              In 2024 NIST finalised its first post-quantum cryptography standards. QSeal’s design targets these families so that the
              records it issues are not tied to schemes a large quantum computer is expected to break.
            </p>
            <ul className="mt-6 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07]">
              {STANDARDS.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="w-20 font-mono text-xs text-steel-500">{s.id}</span>
                    <span className="font-medium text-steel-100">{s.name}</span>
                    <span className="ml-auto text-sm text-steel-500">{s.role}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-sm text-steel-500">
              This list describes the standards landscape. Which algorithms a given deployment uses, and where, is stated in its API
              reference.
            </p>
          </Prose>

          <Prose title="Try the API">
            <CodeWindow />
          </Prose>
        </div>
      </Container>
    </>
  )
}
