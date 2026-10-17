import { ArrowRight } from 'lucide-react'
import { PageHero, Prose } from '@/components/marketing/PageHero'
import { ArchitectureDiagram } from '@/components/marketing/ArchitectureDiagram'
import { Container } from '@/components/marketing/SectionHeader'
import { CodeWindow } from '@/components/marketing/CodeWindow'
import { ButtonLink } from '@/components/ui/Button'
import { getAppUrl } from '@/lib/domains'
import { AvailabilityTag } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const STANDARDS = [
  { id: 'FIPS 203', name: 'ML-KEM-768', role: 'Prompt sealing (with AES-256-GCM)', href: 'https://csrc.nist.gov/pubs/fips/203/final' },
  { id: 'FIPS 204', name: 'ML-DSA-65', role: 'Receipt signatures', href: 'https://csrc.nist.gov/pubs/fips/204/final' },
  { id: 'RFC 8032', name: 'Ed25519', role: 'Classical co-signature on receipts', href: 'https://www.rfc-editor.org/rfc/rfc8032' },
]

const ENDPOINTS: Array<[string, string, string]> = [
  ['POST', '/v1/chat/completions', 'Run an inference (OpenAI format, plus qrouter_receipt)'],
  ['GET', '/v1/models', 'Models, price per request, serving provider'],
  ['POST', '/v1/receipts/verify', 'Verify a receipt or receipt ID'],
  ['GET', '/.well-known/qrouter-keys.json', 'Published ML-KEM and verification keys'],
  ['POST', '/v1/keys/prepaid', 'Buy a prepaid key with a USDC deposit'],
  ['GET', '/v1/keys/balance', 'Prepaid key balance and usage'],
  ['POST', '/v1/payments/prepare', 'Build a USDC transfer for a wallet'],
  ['POST', '/mcp', 'MCP tools: qrouter_infer, qrouter_verify_receipt'],
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
        lede="An OpenAI-compatible gateway that seals prompts with ML-KEM-768, signs every answer with ML-DSA-65, and takes payment in USDC on Solana."
      >
        <ButtonLink to={getAppUrl('/app')}>
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
              QRouter speaks the OpenAI chat-completions format, so existing SDKs and agent frameworks work by changing the base URL and
              using a prepaid key as the API key. Responses carry one extra field, <code className="text-steel-200">qrouter_receipt</code>.
            </p>
            <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07]">
              {ENDPOINTS.map(([m, path, d]) => (
                <li key={path} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[3.5rem_16rem_1fr] sm:items-center">
                  <span className="font-mono text-[11px] text-steel-400">{m}</span>
                  <code className="break-all font-mono text-[12.5px] text-steel-100">{path}</code>
                  <span className="text-sm text-steel-500">{d}</span>
                </li>
              ))}
            </ul>
          </Prose>

          <Prose title="Request lifecycle" aside={<AvailabilityTag value="available" />}>
            <p>
              The gateway validates the request and checks payment first: a prepaid key is charged, or an x402 USDC transfer is
              confirmed on Solana and marked as spent. A sealed request is decrypted in memory. The gateway then forwards it to the
              model provider, signs a receipt over hashes of the prompt and response, and returns both. If the provider fails, the
              charge is refunded or the payment released for a retry.
            </p>
          </Prose>

          <Prose title="Receipts" aside={<AvailabilityTag value="available" />}>
            <p>
              A receipt binds the request and response hashes (SHA-256), the model, token counts, the payment and a timestamp. The
              gateway signs a canonical encoding of those fields twice, with ML-DSA-65 and with Ed25519, and publishes both public keys
              at <code className="text-steel-200">/.well-known/qrouter-keys.json</code>.
            </p>
            <p>
              Verification checks both signatures and that they were made with the gateway’s published keys, so a receipt someone
              signed with their own keys is rejected. The app does this in your browser; you can also do it offline.
            </p>
          </Prose>

          <Prose title="Post-quantum primitives" aside={<AvailabilityTag value="available" />}>
            <p>
              In 2024 NIST finalised its first post-quantum cryptography standards. QRouter uses them in two places: to seal prompts
              between your client and the gateway, and to sign receipts so they remain verifiable after large quantum computers exist.
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
              Sealing covers the hop from your client to the gateway. The gateway decrypts in memory and reaches the model provider
              over the provider’s standard TLS.
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
