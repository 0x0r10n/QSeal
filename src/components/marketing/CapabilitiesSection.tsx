import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, KeyRound, Wallet } from 'lucide-react'
import { Container, SectionHeader } from './SectionHeader'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { AvailabilityTag, StatusTag } from '@/components/ui/StatusTag'
import { QEmblem } from '@/components/brand/QEmblem'
import { useModels } from '@/hooks/useModels'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'

function ModelsTile() {
  const q = useModels()
  const models = q.data ?? []
  let status: React.ReactNode
  if (backendMode === 'unconfigured') status = <StatusTag tone="muted">Not connected</StatusTag>
  else if (backendMode === 'mock') status = <StatusTag tone="warn">Sample data</StatusTag>
  else if (q.isPending) status = <StatusTag tone="info" pulse>Loading</StatusTag>
  else if (q.isError) status = <StatusTag tone="bad">Unreachable</StatusTag>
  else status = <StatusTag tone="ok" pulse>Live · {models.length}</StatusTag>

  return (
    <SpotlightCard className="flex h-full flex-col p-7 sm:p-9">
      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
        <div>
          <p className="eyebrow">Model catalogue</p>
          <h3 className="mt-4 max-w-sm text-2xl font-medium tracking-[-0.03em] text-steel-50 sm:text-[28px]">
            Choose from the models the network actually serves.
          </h3>
        </div>
        {status}
      </div>
      <div className="mt-10 flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950/50">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 font-mono text-[11px] text-steel-500">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-steel-300">GET</span>/v1/models
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {models.length > 0
            ? models.slice(0, 5).map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                  className="flex items-center justify-between px-4 py-3 font-mono text-[12.5px]"
                >
                  <span className="truncate text-steel-100">{m.id}</span>
                  {m.ownedBy && <span className="ml-4 shrink-0 text-steel-600">{m.ownedBy}</span>}
                </motion.li>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="h-2 rounded-full bg-white/[0.06]" style={{ width: `${46 - i * 7}%` }} />
                  <span className="ml-auto h-2 w-12 rounded-full bg-white/[0.04]" />
                </li>
              ))}
        </ul>
        {models.length === 0 && (
          <p className="border-t border-white/[0.05] px-4 py-3 text-[12.5px] text-steel-500">
            {backendMode === 'unconfigured'
              ? 'Connect a backend to list live models. Nothing here is pre-filled.'
              : q.isError
                ? 'The catalogue could not be loaded right now.'
                : 'Loading the catalogue…'}
          </p>
        )}
      </div>
    </SpotlightCard>
  )
}

function ReceiptTile() {
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
          className="relative w-full max-w-[260px] rounded-t-xl border border-b-0 border-white/10 bg-[linear-gradient(180deg,#1c1c21,#121215)] px-6 pb-10 pt-6 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
          aria-hidden
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel-400">Receipt</span>
            <span className="h-1.5 w-10 rounded-full bg-white/10" />
          </div>
          <div className="mt-6 space-y-3">
            {[82, 64, 74, 40, 58].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="h-1.5 w-8 rounded-full bg-white/[0.05]" />
                <span className="h-1.5 rounded-full bg-white/[0.12]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-dashed border-white/10 pt-5">
            <div className="font-mono text-[9px] leading-[1.6] tracking-[0.12em] text-steel-600 break-all">
              ▚▞▙▟▛▜▚▞▙▟▛▜▚▞▙▟▛▜▚▞▙▟▛▜▚▞▙▟▛▜▚▞▙▟
            </div>
          </div>
          <motion.div
            initial={{ scale: 1.6, opacity: 0, rotate: -20 }}
            whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
            className="absolute -right-5 bottom-6 grid size-20 place-items-center rounded-full border border-white/20 bg-ink-900/90 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur"
          >
            <QEmblem className="h-9 w-auto" detail="mark" />
          </motion.div>
        </motion.div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <span className="text-[13px] text-steel-500">Illustrative — format per API reference</span>
        <Link to="/app/verify" className="inline-flex items-center gap-1 text-[13px] text-steel-200 hover:text-white">
          Verify <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </SpotlightCard>
  )
}

function PaymentsTile() {
  const rails = [
    { icon: Wallet, name: 'Solana wallet', body: 'Authenticate and pay from a wallet you control.' },
    { icon: KeyRound, name: 'Prepaid key', body: 'Fund once, then call the API without signing per request.' },
  ]
  return (
    <SpotlightCard className="h-full p-7 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">Payments & access</p>
        <AvailabilityTag value="available" />
      </div>
      <h3 className="mt-4 max-w-md text-2xl font-medium tracking-[-0.03em] text-steel-50">Two ways in. No subscription required.</h3>
      <div className="mt-9 grid gap-3 sm:grid-cols-2">
        {rails.map((r) => (
          <div key={r.name} className="rounded-2xl border border-white/[0.07] bg-ink-950/40 p-5">
            <r.icon className="size-5 text-steel-200" strokeWidth={1.5} />
            <p className="mt-6 font-medium text-steel-100">{r.name}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel-500">{r.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[12.5px] leading-relaxed text-steel-600">
        Wallet signatures secure payments. They are classical (Ed25519) and are not part of QSeal’s post-quantum design.
      </p>
    </SpotlightCard>
  )
}

function EndpointsTile() {
  const endpoints = [
    { m: 'GET', p: '/v1/models', d: 'List available models' },
    { m: 'POST', p: '/v1/chat/completions', d: 'Run an inference' },
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
        Programmatic access suits autonomous agents: a prepaid key and a base URL is all an agent needs.
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
              Everything you need to <span className="text-chrome">seal</span> an inference.
            </>
          }
          lede="Models, requests, receipts, payments and programmatic access — the capabilities that make up QSeal today."
        />
        <Reveal className="mt-16 grid gap-4 lg:grid-cols-6 lg:grid-rows-[auto_auto]" gap={0.1}>
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
