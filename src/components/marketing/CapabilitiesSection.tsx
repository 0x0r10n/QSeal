import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, KeyRound, Wallet } from 'lucide-react'
import { Container, SectionHeader } from './SectionHeader'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { AvailabilityTag, StatusTag } from '@/components/ui/StatusTag'
import { QEmblem } from '@/components/brand/QEmblem'
import { ModelLogo } from '@/components/brand/ModelLogo'
import { MODEL_CATALOGUE, VENDOR_NAME, formatContext } from '@/content/models'
import { cn } from '@/lib/cn'
import { useModels } from '@/hooks/useModels'
import { useHealth, useReceiptStats } from '@/hooks/useGateway'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'

function ModelsTile() {
  const q = useModels()
  const live = new Map((q.data ?? []).map((m) => [m.id, m]))
  let status: React.ReactNode
  if (backendMode === 'unconfigured') status = <StatusTag tone="neutral" dot={false}>{MODEL_CATALOGUE.length} models</StatusTag>
  else if (backendMode === 'mock') status = <StatusTag tone="warn">Sample data</StatusTag>
  else if (q.isPending) status = <StatusTag tone="info" pulse>Checking</StatusTag>
  else if (q.isError) status = <StatusTag tone="bad">Gateway unreachable</StatusTag>
  else status = <StatusTag tone="ok" pulse>Live · {live.size} available</StatusTag>

  return (
    <SpotlightCard className="flex h-full flex-col p-7 sm:p-9">
      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
        <div>
          <p className="eyebrow">Models</p>
          <h3 className="mt-4 max-w-md text-2xl font-medium tracking-[-0.03em] text-steel-50 sm:text-[28px]">
            Leading open models from Meta and DeepSeek.
          </h3>
        </div>
        {status}
      </div>
      <ul className="mt-9 flex-1 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-950/50">
        {MODEL_CATALOGUE.map((m, i) => {
          const l = live.get(m.id)
          const offline = backendMode === 'live' && q.isSuccess && !l
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
              className={cn('flex items-center gap-4 px-4 py-3.5 sm:px-5', offline && 'opacity-50')}
            >
              <ModelLogo vendor={m.vendor} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-medium text-steel-50">
                  {l?.family ?? m.family}
                  {m.tags.map((t) => (
                    <span key={t} className="rounded-full border border-white/10 px-1.5 py-px font-mono text-[9.5px] font-normal uppercase tracking-[0.08em] text-steel-400">
                      {t}
                    </span>
                  ))}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11.5px] text-steel-500">
                  {m.id} · {VENDOR_NAME[m.vendor]} · {formatContext(m.contextWindow)}
                </p>
              </div>
              <span className="hidden shrink-0 text-right font-mono text-[11.5px] text-steel-300 sm:block">
                {l?.priceUsdc !== undefined ? `${l.priceUsdc} USDC` : offline ? 'Not served' : ''}
              </span>
            </motion.li>
          )
        })}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-steel-500">
        {backendMode === 'live' && q.isSuccess
          ? 'Live from GET /v1/models: price per request and availability on this gateway.'
          : 'Each model is served by the deployment’s configured provider. Prices per request appear once the app is connected.'}
      </p>
    </SpotlightCard>
  )
}

const RECEIPT_FIELDS: Array<[string, string]> = [
  ['id', 'rcpt_6f8d…'],
  ['model', 'qrouter-quantum-70b'],
  ['promptHash', 'sha256 · 79b3…'],
  ['responseHash', 'sha256 · 1c8c…'],
  ['tokens', '2 · 46 · 48'],
  ['payment', 'prepaid-key · 0.001'],
]

function ReceiptTile() {
  const stats = useReceiptStats()
  return (
    <SpotlightCard className="flex h-full flex-col p-7 sm:p-9">
      <p className="eyebrow">Signed receipts</p>
      <h3 className="mt-4 text-2xl font-medium tracking-[-0.03em] text-steel-50">A record that travels with the answer.</h3>
      <div className="relative mt-10 flex flex-1 items-end justify-center">
        <motion.div
          initial={{ y: 30, rotate: -4, opacity: 0 }}
          whileInView={{ y: 0, rotate: -2, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.2, ease: EASE }}
          className="relative w-full max-w-[280px] rounded-t-xl border border-b-0 border-white/10 bg-[linear-gradient(180deg,#1c1c21,#121215)] px-5 pb-9 pt-5 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel-400">qrouter_receipt</span>
            <span className="font-mono text-[9.5px] text-steel-600">v2</span>
          </div>
          <dl className="mt-4 space-y-1.5 font-mono text-[10.5px]">
            {RECEIPT_FIELDS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-steel-500">{k}</dt>
                <dd className="truncate text-steel-200">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t border-dashed border-white/10 pt-3 font-mono text-[10px] text-steel-500">
            <p>mlDsaSignature · 3309 bytes</p>
            <p>ed25519Signature · 64 bytes</p>
          </div>
          <motion.div
            initial={{ scale: 1.6, opacity: 0, rotate: -20 }}
            whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
            className="absolute -right-5 bottom-5 grid size-[72px] place-items-center rounded-full border border-white/20 bg-ink-900/90 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur"
            aria-hidden
          >
            <QEmblem className="h-8 w-auto" detail="mark" />
          </motion.div>
        </motion.div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <span className="text-[13px] text-steel-500">
          {stats.data ? `${stats.data.totalReceiptsIssued.toLocaleString()} issued on this gateway` : 'Hashes only. Never your prompt.'}
        </span>
        <Link to="/app/verify" className="inline-flex items-center gap-1 text-[13px] text-steel-200 hover:text-white">
          Verify one <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </SpotlightCard>
  )
}

function PaymentsTile() {
  const health = useHealth()
  const sol = health.data?.solana
  const rails = [
    {
      icon: Wallet,
      name: 'Pay per request',
      body: 'An x402 USDC transfer from your wallet, verified on-chain and usable once.',
      live: sol ? `${sol.price_per_request_usdc} USDC per request` : undefined,
    },
    {
      icon: KeyRound,
      name: 'Prepaid key',
      body: 'Fund once with USDC, then call the API like any OpenAI key.',
      live: sol ? `From ${sol.min_prepaid_deposit_usdc} USDC deposit` : undefined,
    },
  ]
  return (
    <SpotlightCard className="h-full p-7 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">Payments & access</p>
        {sol ? (
          <StatusTag tone={sol.network === 'mainnet-beta' ? 'ok' : 'warn'} pulse>
            {sol.network === 'mainnet-beta' ? 'Solana mainnet' : 'Solana devnet'}
          </StatusTag>
        ) : (
          <AvailabilityTag value="available" />
        )}
      </div>
      <h3 className="mt-4 max-w-md text-2xl font-medium tracking-[-0.03em] text-steel-50">USDC on Solana. No account, no subscription.</h3>
      <div className="mt-9 grid gap-3 sm:grid-cols-2">
        {rails.map((r) => (
          <div key={r.name} className="rounded-2xl border border-white/[0.07] bg-ink-950/40 p-5">
            <r.icon className="size-5 text-steel-200" strokeWidth={1.5} />
            <p className="mt-6 font-medium text-steel-100">{r.name}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel-500">{r.body}</p>
            {r.live && <p className="mt-3 font-mono text-[12px] text-steel-200">{r.live}</p>}
          </div>
        ))}
      </div>
      <p className="mt-5 text-[12.5px] leading-relaxed text-steel-600">
        Failed requests are refunded automatically. Wallet signatures are classical (Ed25519) and sit outside QRouter’s post-quantum design.
      </p>
    </SpotlightCard>
  )
}

function EndpointsTile() {
  const endpoints = [
    { m: 'POST', p: '/v1/chat/completions', d: 'Run an inference' },
    { m: 'GET', p: '/v1/models', d: 'Models and prices' },
    { m: 'POST', p: '/v1/receipts/verify', d: 'Check a receipt' },
    { m: 'POST', p: '/mcp', d: 'MCP tools for agents' },
  ]
  return (
    <SpotlightCard className="h-full p-7 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">Developer access</p>
        <StatusTag tone="neutral" dot={false}>OpenAI-compatible</StatusTag>
      </div>
      <h3 className="mt-4 max-w-md text-2xl font-medium tracking-[-0.03em] text-steel-50">Built for agents as much as people.</h3>
      <ul className="mt-9 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-ink-950/40">
        {endpoints.map((e) => (
          <li key={e.p} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
            <span className="w-11 font-mono text-[11px] text-steel-400">{e.m}</span>
            <code className="font-mono text-[13px] text-steel-100">{e.p}</code>
            <span className="ml-auto text-[13px] text-steel-500">{e.d}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[12.5px] leading-relaxed text-steel-600">
        Point the OpenAI SDK at QRouter with a prepaid key, or plug the MCP endpoint into an agent framework.
      </p>
    </SpotlightCard>
  )
}

export function CapabilitiesSection() {
  return (
    <section id="product" aria-labelledby="product-title" className="relative scroll-mt-16 py-28 md:py-40">
      <Container>
        <SectionHeader
          index="05"
          eyebrow="Product"
          titleId="product-title"
          title={
            <>
              Everything you need to <span className="text-chrome">route and secure</span> an inference.
            </>
          }
          lede="Models, requests, receipts, payments and programmatic access — the capabilities that make up QRouter today."
        />
        <Reveal className="mt-16 grid gap-4 lg:grid-cols-6 lg:grid-rows-[auto_auto] [&>*]:min-w-0" gap={0.1}>
          <RevealItem className="lg:col-span-4">
            <ModelsTile />
          </RevealItem>
          <RevealItem className="lg:col-span-2">
            <ReceiptTile />
          </RevealItem>
          <RevealItem className="lg:col-span-3">
            <PaymentsTile />
          </RevealItem>
          <RevealItem className="lg:col-span-3">
            <EndpointsTile />
          </RevealItem>
        </Reveal>
      </Container>
    </section>
  )
}
