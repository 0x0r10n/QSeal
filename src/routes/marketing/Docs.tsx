import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Boxes, KeyRound, ScanLine, Terminal } from 'lucide-react'
import { PageHero, Prose } from '@/components/marketing/PageHero'
import { Container } from '@/components/marketing/SectionHeader'
import { CodeWindow } from '@/components/marketing/CodeWindow'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { StatusTag } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const GUIDES = [
  { icon: Terminal, title: 'Quickstart', body: 'Send your first request from the terminal.', href: '#quickstart' },
  { icon: Boxes, title: 'Models', body: 'Discover what the network serves.', href: '#endpoints' },
  { icon: ScanLine, title: 'Receipts', body: 'Store and verify execution records.', href: '#receipts' },
  { icon: KeyRound, title: 'Access', body: 'Wallets and prepaid keys.', href: '#access' },
]

const ENV = `VITE_QSEAL_API_URL=https://your-qseal-backend.example`

export default function Docs() {
  useDocumentTitle('Documentation')
  return (
    <>
      <PageHero
        eyebrow="Documentation"
        title={
          <>
            Build with <span className="text-chrome">QSeal.</span>
          </>
        }
        lede="Everything you need to call the API, choose a model, and keep verifiable records of every inference."
      />
      <Container className="py-20 md:py-28">
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
          {GUIDES.map((g) => (
            <RevealItem key={g.title}>
              <a href={g.href} className="block h-full rounded-3xl">
                <SpotlightCard className="h-full p-6 transition-colors hover:border-white/15">
                  <g.icon className="size-5 text-steel-200" strokeWidth={1.5} />
                  <p className="mt-8 font-medium text-steel-50">{g.title}</p>
                  <p className="mt-1.5 text-sm text-steel-500">{g.body}</p>
                </SpotlightCard>
              </a>
            </RevealItem>
          ))}
        </Reveal>

        <div className="mt-20">
          <div id="quickstart" className="scroll-mt-24">
            <Prose title="Quickstart" aside={<StatusTag tone="warn">Illustrative</StatusTag>}>
              <p>
                Point any OpenAI-compatible client at your QSeal base URL. The samples below show the expected shape; confirm field names
                and authentication against the API reference for your deployment.
              </p>
              <CodeWindow />
            </Prose>
          </div>

          <div id="endpoints" className="scroll-mt-24">
            <Prose title="Endpoints">
              <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07]">
                {[
                  ['GET', '/v1/models', 'Returns the model catalogue. The app’s model picker reads this live.'],
                  ['POST', '/v1/chat/completions', 'Runs an inference for a model and a list of messages.'],
                ].map(([m, p, d]) => (
                  <li key={p} className="grid gap-2 px-5 py-4 sm:grid-cols-[3.5rem_14rem_1fr] sm:items-center">
                    <span className="font-mono text-[11px] text-steel-400">{m}</span>
                    <code className="font-mono text-[13px] text-steel-100">{p}</code>
                    <span className="text-sm text-steel-500">{d}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-steel-500">Other endpoints are listed in each deployment’s API reference.</p>
            </Prose>
          </div>

          <div id="receipts" className="scroll-mt-24">
            <Prose title="Receipts">
              <p>
                Store the receipt that accompanies a response. To check one, paste it into{' '}
                <Link to="/app/verify" className="text-steel-100 underline decoration-white/20 underline-offset-4 hover:decoration-white">
                  Verify Receipt
                </Link>
                . The app reports <em>valid</em> only after a configured verifier has checked the signature; otherwise it says it was
                unable to verify.
              </p>
            </Prose>
          </div>

          <div id="access" className="scroll-mt-24">
            <Prose title="Access & payments">
              <p>
                Pay per request from a Solana wallet, or use a prepaid key for unattended access — the natural choice for autonomous
                agents. Wallet connection in this web app is enabled once a deployment supplies its wallet and payment configuration.
              </p>
            </Prose>
          </div>

          <Prose title="Self-hosting this frontend">
            <p>This web app is a standalone frontend. Connect it to a backend with a single environment variable:</p>
            <div className="surface flex items-center gap-3 rounded-2xl p-4">
              <Code code={ENV} lang="bash" lineNumbers={false} className="flex-1" />
              <CopyButton value={ENV} />
            </div>
            <p className="text-sm text-steel-500">
              Without it, the app runs in a clearly-labelled unconnected mode and makes no network requests.
            </p>
          </Prose>

          <div className="mt-6 flex flex-wrap gap-6 border-t border-white/[0.07] pt-10">
            <Link to="/app/new" className="group inline-flex items-center gap-2 text-steel-100">
              Open the request composer <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="https://platform.openai.com/docs/api-reference/chat"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-steel-400 hover:text-steel-100"
            >
              OpenAI chat-completions format <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </Container>
    </>
  )
}
