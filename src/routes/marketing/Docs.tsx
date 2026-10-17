import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Boxes, CreditCard, KeyRound, Lock, ScanLine } from 'lucide-react'
import { PageHero, Prose } from '@/components/marketing/PageHero'
import { Container } from '@/components/marketing/SectionHeader'
import { CodeWindow } from '@/components/marketing/CodeWindow'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const GUIDES = [
  { icon: KeyRound, title: 'Get a key', body: 'Buy a prepaid key with USDC.', href: '#access' },
  { icon: Boxes, title: 'Quickstart', body: 'Call QSeal with the OpenAI SDK.', href: '#quickstart' },
  { icon: CreditCard, title: 'Pay per request', body: 'x402 USDC payments on Solana.', href: '#x402' },
  { icon: Lock, title: 'Sealed prompts', body: 'ML-KEM-768 + AES-256-GCM.', href: '#sealing' },
  { icon: ScanLine, title: 'Receipts', body: 'Verify ML-DSA-65 signatures.', href: '#receipts' },
  { icon: Bot, title: 'MCP', body: 'Tools for AI agents.', href: '#mcp' },
]

const ENDPOINTS: Array<[string, string, string]> = [
  ['POST', '/v1/chat/completions', 'Run an inference. OpenAI request and response format, plus qseal_receipt.'],
  ['GET', '/v1/models', 'Available models with price per request and serving provider.'],
  ['POST', '/v1/receipts/verify', 'Body { receipt } or { receipt_id }. Returns both signature checks.'],
  ['GET', '/v1/receipts/:id', 'Fetch a stored receipt (hashes only) and its verification.'],
  ['GET', '/.well-known/qseal-keys.json', 'ML-KEM-768 sealing key and ML-DSA-65 / Ed25519 verification keys.'],
  ['POST', '/v1/keys/prepaid', 'Body { payment_signature }. Exchanges a USDC deposit for a new key.'],
  ['POST', '/v1/keys/topup', 'Authorization: Bearer key, body { payment_signature }. Adds a deposit.'],
  ['GET', '/v1/keys/balance', 'Authorization: Bearer key. Balance, spend and request count.'],
  ['POST', '/v1/payments/prepare', 'Body { payer, purpose, model | amount_usdc }. Unsigned USDC transfer for a wallet.'],
  ['POST', '/mcp', 'JSON-RPC: initialize, tools/list, tools/call.'],
  ['GET', '/health', 'Network, pricing, provider and mode.'],
]

const X402 = `# 1. Without payment, the gateway answers 402 with an x402 challenge
curl -i -X POST "$QSEAL_API_URL/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"qseal-quantum-70b","messages":[{"role":"user","content":"Hi"}]}'
# HTTP/1.1 402 Payment Required
# PAYMENT-REQUIRED: <base64 JSON: price, network, payTo, asset (USDC), reference>

# 2. Send the USDC transfer on Solana, then retry with its signature
curl -X POST "$QSEAL_API_URL/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "PAYMENT-SIGNATURE: <tx signature>" \\
  -d '{"model":"qseal-quantum-70b","messages":[{"role":"user","content":"Hi"}]}'`

const MCP = `curl -X POST "$QSEAL_API_URL/mcp" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $QSEAL_KEY" \\
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": { "name": "qseal_infer", "arguments": { "prompt": "Hello" } }
  }'`

const ENV = `VITE_QSEAL_API_URL=https://your-qseal-gateway.example`

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
        lede="Call the API with the OpenAI SDK you already use, pay in USDC on Solana, and keep a verifiable receipt for every answer."
      />
      <Container className="py-20 md:py-28">
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
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
          <div id="access" className="scroll-mt-24">
            <Prose title="Get a key">
              <p>
                Open <Link to="/app/keys" className="text-steel-100 underline decoration-white/20 underline-offset-4 hover:decoration-white">Prepaid Keys</Link>,
                connect a Solana wallet holding USDC, and buy a key. The key is shown once; the gateway stores only its hash. Each
                request deducts its price from the balance, and failed requests are refunded.
              </p>
              <p>
                Use the key as the API key in any OpenAI-compatible client. It is sent as <code className="text-steel-200">Authorization: Bearer qseal_sk_…</code>.
              </p>
            </Prose>
          </div>

          <div id="quickstart" className="scroll-mt-24">
            <Prose title="Quickstart">
              <p>Set <code className="text-steel-200">QSEAL_API_URL</code> to your gateway and <code className="text-steel-200">QSEAL_KEY</code> to your prepaid key, then run any of these.</p>
              <CodeWindow />
            </Prose>
          </div>

          <div id="endpoints" className="scroll-mt-24">
            <Prose title="Endpoints">
              <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07]">
                {ENDPOINTS.map(([m, p, d]) => (
                  <li key={p} className="grid gap-1.5 px-5 py-4 sm:grid-cols-[3.5rem_15rem_1fr] sm:items-center">
                    <span className="font-mono text-[11px] text-steel-400">{m}</span>
                    <code className="break-all font-mono text-[12.5px] text-steel-100">{p}</code>
                    <span className="text-sm text-steel-500">{d}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-steel-500">
                Chat requests accept <code>model</code>, <code>messages</code>, <code>temperature</code> (0–2), <code>max_tokens</code> (1–32768),{' '}
                <code>top_p</code> and <code>stream</code>. Invalid requests are rejected before anything is charged.
              </p>
            </Prose>
          </div>

          <div id="x402" className="scroll-mt-24">
            <Prose title="Pay per request (x402)">
              <p>
                Without a key, each request can be paid on its own using the x402 protocol. The gateway answers{' '}
                <code className="text-steel-200">402 Payment Required</code> with a challenge; you send the USDC transfer on Solana and
                retry with its signature. Each payment is checked on-chain and can be used once, within 15 minutes.
              </p>
              <div className="surface relative overflow-hidden rounded-2xl p-5">
                <Code code={X402} lang="bash" />
                <CopyButton value={X402} className="absolute right-4 top-4" />
              </div>
              <p className="text-sm text-steel-500">The app does this for you: choose “Wallet, pay per request” in New Request.</p>
            </Prose>
          </div>

          <div id="sealing" className="scroll-mt-24">
            <Prose title="Sealed prompts">
              <p>
                To keep a request encrypted to the gateway beyond TLS, encapsulate to the gateway’s ML-KEM-768 key from{' '}
                <code className="text-steel-200">/.well-known/qseal-keys.json</code>, derive an AES-256-GCM key with SHA-256 of the
                shared secret, and send <code className="text-steel-200">{'{ sealed: true, kemCiphertext, iv, authTag, ciphertext }'}</code>{' '}
                instead of the plain body. Add <code className="text-steel-200">clientEphemeralKemPubkey</code> to receive a sealed
                response.
              </p>
              <p>
                The gateway decrypts the request in memory to run it, and forwards the prompt to the model provider over that
                provider’s TLS. The app seals by default.
              </p>
            </Prose>
          </div>

          <div id="receipts" className="scroll-mt-24">
            <Prose title="Receipts">
              <p>
                Every completion includes <code className="text-steel-200">qseal_receipt</code>: hashes of the prompt and response,
                the model, token counts, the payment and a timestamp, signed with ML-DSA-65 and Ed25519. Store it with the response.
              </p>
              <p>
                Check one in{' '}
                <Link to="/app/verify" className="text-steel-100 underline decoration-white/20 underline-offset-4 hover:decoration-white">
                  Verify Receipt
                </Link>
                , with <code className="text-steel-200">POST /v1/receipts/verify</code>, or offline with any ML-DSA-65 implementation
                against the published keys. A receipt signed with any other key is reported invalid.
              </p>
            </Prose>
          </div>

          <div id="mcp" className="scroll-mt-24">
            <Prose title="MCP for agents">
              <p>
                <code className="text-steel-200">POST /mcp</code> exposes two tools, <code className="text-steel-200">qseal_infer</code>{' '}
                and <code className="text-steel-200">qseal_verify_receipt</code>, over JSON-RPC. Inference through MCP is paid exactly
                like the chat endpoint: send a prepaid key or an x402 payment header.
              </p>
              <div className="surface relative overflow-hidden rounded-2xl p-5">
                <Code code={MCP} lang="bash" />
                <CopyButton value={MCP} className="absolute right-4 top-4" />
              </div>
            </Prose>
          </div>

          <Prose title="Self-hosting">
            <p>
              The gateway lives in <code className="text-steel-200">backend/</code> and can also serve this web app from the same
              origin. To run the web app separately, point it at the gateway:
            </p>
            <div className="surface flex items-center gap-3 rounded-2xl p-4">
              <Code code={ENV} lang="bash" lineNumbers={false} className="flex-1" />
              <CopyButton value={ENV} />
            </div>
          </Prose>

          <div className="mt-6 flex flex-wrap gap-6 border-t border-white/[0.07] pt-10">
            <Link to="/app/keys" className="group inline-flex items-center gap-2 text-steel-100">
              Buy a prepaid key <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <Link to="/app/new" className="group inline-flex items-center gap-2 text-steel-400 hover:text-steel-100">
              Open the request composer <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Container>
    </>
  )
}
