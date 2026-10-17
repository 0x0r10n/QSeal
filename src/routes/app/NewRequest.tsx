import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CornerDownLeft, KeyRound, Lock, LockOpen, ScanLine, Sparkles, Square, Wallet } from 'lucide-react'
import { PageHeader, Panel, StatePanel, fieldClass } from '@/components/application/ui'
import { WalletMenu } from '@/components/application/WalletMenu'
import { ModelLogo } from '@/components/brand/ModelLogo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { SealingChamber, type ChamberState } from '@/features/request/SealingChamber'
import { historyStore, newId } from '@/features/history/store'
import { useModels } from '@/hooks/useModels'
import { useAccessKey } from '@/hooks/useAccessKey'
import { useKeyBalance } from '@/hooks/useGateway'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { createChatCompletion } from '@/services/api/chat'
import { ApiError, describeError } from '@/services/api/errors'
import { verifyReceipt } from '@/services/receipts'
import { maskKey } from '@/services/api/credentials'
import { payFromWallet } from '@/services/wallet/pay'
import { useWallet } from '@/services/wallet/wallet'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'
import type { ChatCompletionResult, ChatMessage, Payment } from '@/types/api'

type Result = { ok: true; data: ChatCompletionResult } | { ok: false; error: { title: string; detail: string }; payment?: boolean }
type PayMethod = 'key' | 'wallet' | 'trial'

const usdc = (n: number | undefined) => (n === undefined ? '—' : `${n < 0.01 ? n.toFixed(4) : n.toFixed(2)} USDC`)

export default function NewRequest() {
  useDocumentTitle('New Request')
  const models = useModels()
  const key = useAccessKey()
  const balance = useKeyBalance()
  const { account } = useWallet()
  const trial = useTrialStatus(account?.address)
  const queryClient = useQueryClient()

  const [model, setModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [system, setSystem] = useState('')
  const [showSystem, setShowSystem] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extra, setExtra] = useState('')
  const [seal, setSeal] = useState(backendMode === 'live')
  const [method, setMethod] = useState<PayMethod | null>(null)
  const [chamber, setChamber] = useState<ChamberState>({ phase: 'idle', ready: false, paymentMethod: null, sealed: seal })
  const [result, setResult] = useState<Result | null>(null)
  const [view, setView] = useState<'text' | 'raw'>('text')
  /** A wallet payment the gateway did not consume (inference failed): reused on retry. */
  const [unusedPayment, setUnusedPayment] = useState<{ signature: string; reference: string; model: string } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const remainingTrials = trial.data?.remaining ?? (account ? 3 : 0)
  const hasFreeTrial = Boolean(account && remainingTrials > 0)

  useEffect(() => {
    if (!model && models.data?.length) setModel(models.data[0].id)
  }, [models.data, model])

  // Default to free trial if available, then prepaid key, else wallet.
  useEffect(() => {
    setMethod((m) => {
      if (m === 'trial' && hasFreeTrial) return 'trial'
      if (m === 'key' && key) return 'key'
      if (m === 'wallet' && account) return 'wallet'
      if (hasFreeTrial) return 'trial'
      if (key) return 'key'
      if (account) return 'wallet'
      return null
    })
  }, [key, account, hasFreeTrial])

  const extraParsed = useMemo((): { ok: true; value?: Record<string, unknown> } | { ok: false; msg: string } => {
    if (!extra.trim()) return { ok: true }
    try {
      const v = JSON.parse(extra)
      if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, msg: 'Must be a JSON object.' }
      return { ok: true, value: v }
    } catch {
      return { ok: false, msg: 'Invalid JSON.' }
    }
  }, [extra])

  const selected = models.data?.find((m) => m.id === model)
  const price = selected?.priceUsdc
  const ready = Boolean(model && prompt.trim())
  const busy = chamber.phase === 'sending' || chamber.phase === 'paying'
  const paymentReady =
    backendMode === 'mock' ||
    (method === 'trial' && hasFreeTrial) ||
    (method === 'key' && key) ||
    (method === 'wallet' && account)
  const canSend = ready && !busy && extraParsed.ok && backendMode !== 'unconfigured' && Boolean(paymentReady)

  useEffect(() => {
    setChamber((c) => (c.phase === 'idle' ? { ...c, ready, paymentMethod: method, sealed: seal } : c))
  }, [ready, method, seal])

  useEffect(() => () => abort.current?.abort(), [])

  async function send() {
    if (!canSend || !extraParsed.ok || !method) return
    const messages: ChatMessage[] = [
      ...(system.trim() ? [{ role: 'system' as const, content: system.trim() }] : []),
      { role: 'user', content: prompt.trim() },
    ]
    const id = newId()
    historyStore.add({
      id,
      createdAt: Date.now(),
      model,
      prompt: prompt.trim(),
      system: system.trim() || undefined,
      status: 'pending',
      sealed: seal,
      payment: method,
      priceUsdc: price,
      sample: backendMode === 'mock',
    })
    setResult(null)
    abort.current = new AbortController()
    const base: ChamberState = { phase: 'idle', ready: true, paymentMethod: method, sealed: seal }

    // 1. Payment
    let payment: Payment = { kind: 'key' }
    if (method === 'trial' && account) {
      payment = { kind: 'trial', wallet: account.address }
    } else if (method === 'wallet' && account && backendMode === 'live') {
      if (unusedPayment && unusedPayment.model === model) {
        payment = { kind: 'x402', signature: unusedPayment.signature, reference: unusedPayment.reference }
      } else {
        setChamber({ ...base, phase: 'paying', payStage: 'preparing' })
        try {
          const paid = await payFromWallet(account.address, { kind: 'request', model }, (payStage) =>
            setChamber((c) => ({ ...c, payStage })),
          )
          payment = { kind: 'x402', signature: paid.signature, reference: paid.reference }
          setUnusedPayment({ signature: paid.signature, reference: paid.reference, model })
        } catch (e) {
          const err = e instanceof ApiError ? describeError(e) : { title: 'Payment not sent', detail: e instanceof Error ? e.message : String(e) }
          historyStore.update(id, { status: 'failed', error: err })
          setResult({ ok: false, error: err, payment: true })
          setChamber({ ...base, phase: 'error', failedAt: 'payment', errorTitle: err.title })
          return
        }
      }
      historyStore.update(id, { paymentSignature: payment.signature })
    }

    // 2. Request
    const startedAt = performance.now()
    setChamber({ ...base, phase: 'sending', startedAt })
    try {
      const data = await createChatCompletion({ model, messages, payment, seal: seal && backendMode === 'live', extra: extraParsed.value }, abort.current.signal)
      if (payment.kind === 'x402') setUnusedPayment(null)
      historyStore.update(id, {
        status: 'completed',
        responseText: data.text,
        responseRaw: data.raw,
        responseId: data.id,
        httpStatus: data.status,
        latencyMs: data.latencyMs,
        receipt: data.receipt,
        sealed: data.sealed,
      })
      setResult({ ok: true, data })
      setView(data.text ? 'text' : 'raw')
      setChamber({
        ...base,
        phase: 'done',
        startedAt,
        latencyMs: data.latencyMs,
        httpStatus: data.status,
        sealed: data.sealed,
        receipt: data.receipt ? { id: data.receipt.id, check: 'checking' } : null,
      })
      void queryClient.invalidateQueries({ queryKey: ['balance'] })
      void queryClient.invalidateQueries({ queryKey: ['trial-status'] })

      // 3. Check the receipt's signatures right away.
      if (data.receipt) {
        const outcome = await verifyReceipt(JSON.stringify(data.receipt))
        const check = outcome.status === 'valid' ? 'valid' : outcome.status === 'invalid' ? 'invalid' : 'unable'
        historyStore.update(id, { receiptCheck: check })
        setChamber((c) => (c.receipt ? { ...c, receipt: { ...c.receipt, check } } : c))
      }
    } catch (e) {
      const err = describeError(e)
      const cancelled = e instanceof ApiError && e.kind === 'aborted'
      const paymentRefused = e instanceof ApiError && e.kind === 'payment'
      // A spent or invalid on-chain payment cannot be reused.
      if (paymentRefused && /already spent|older than|Insufficient payment/.test(err.detail)) setUnusedPayment(null)
      historyStore.update(id, {
        status: cancelled ? 'cancelled' : 'failed',
        error: err,
        httpStatus: e instanceof ApiError ? e.status : undefined,
        responseRaw: e instanceof ApiError ? e.body : undefined,
        latencyMs: performance.now() - startedAt,
      })
      setResult(cancelled ? null : { ok: false, error: err, payment: paymentRefused })
      setChamber({ ...base, phase: cancelled ? 'cancelled' : 'error', startedAt, failedAt: paymentRefused ? 'payment' : 'request', errorTitle: err.title })
      void queryClient.invalidateQueries({ queryKey: ['balance'] })
      void queryClient.invalidateQueries({ queryKey: ['trial-status'] })
    } finally {
      abort.current = null
    }
  }

  const modelOptions = models.data ?? []

  return (
    <>
      <PageHeader
        eyebrow="Inference"
        title="New request"
        description="Compose a chat completion. Pay with your prepaid key or straight from your wallet, and get a signed receipt back."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
            className="surface overflow-hidden rounded-2xl"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <label htmlFor="model" className="sr-only">Model</label>
              <ModelLogo vendor={selected?.vendor} size="sm" />
              <div className="relative">
                <select
                  id="model"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value)
                    setUnusedPayment(null)
                  }}
                  disabled={modelOptions.length === 0 || busy}
                  className={cn(fieldClass, 'h-9 min-w-[210px] max-w-[min(100%,360px)] appearance-none truncate pr-9 text-[12.5px]')}
                >
                  {modelOptions.length === 0 && (
                    <option value="">
                      {backendMode === 'unconfigured' ? 'No backend configured' : models.isPending ? 'Loading models…' : models.isError ? 'Models unavailable' : 'No models'}
                    </option>
                  )}
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.family ? `${m.family} · ${m.id}` : m.id}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
              </div>
              {price !== undefined && <span className="font-mono text-[11.5px] text-steel-400">{usdc(price)} / request</span>}
              <button
                type="button"
                onClick={() => setSeal((v) => !v)}
                disabled={busy || backendMode !== 'live'}
                aria-pressed={seal}
                title="Encrypt this request to the gateway’s ML-KEM-768 key. The gateway decrypts it in memory to run the model."
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition disabled:opacity-40',
                  seal ? 'border-white/25 bg-white/[0.08] text-steel-50' : 'border-white/10 text-steel-400 hover:text-steel-100',
                )}
              >
                {seal ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                {seal ? 'Sealed (ML-KEM-768)' : 'Not sealed'}
              </button>
              <button
                type="button"
                onClick={() => setShowSystem((v) => !v)}
                className="ml-auto text-[12.5px] text-steel-400 hover:text-steel-100"
                aria-expanded={showSystem}
              >
                {showSystem ? 'Hide' : 'Add'} system prompt
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showSystem && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden border-b border-white/[0.06]"
                >
                  <label htmlFor="system" className="sr-only">System prompt</label>
                  <textarea
                    id="system"
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                    disabled={busy}
                    rows={3}
                    placeholder="System prompt (optional)"
                    className="block w-full resize-y bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-steel-200 placeholder:text-steel-600 focus:outline-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <label htmlFor="prompt" className="sr-only">Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void send()
                }
              }}
              disabled={busy}
              rows={10}
              placeholder="Ask anything. Nothing is sent until you press Seal & send."
              className="block min-h-[240px] w-full resize-y bg-transparent px-5 py-5 text-[15.5px] leading-[1.7] text-steel-50 placeholder:text-steel-600 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-4 py-3">
              <span className="font-mono text-[11px] tabular-nums text-steel-600">{prompt.length.toLocaleString()} chars</span>
              <span className="hidden items-center gap-1 font-mono text-[11px] text-steel-600 sm:inline-flex">
                <CornerDownLeft className="size-3" /> ⌘/Ctrl + Enter
              </span>
              <div className="ml-auto flex items-center gap-2">
                {chamber.phase === 'sending' && (
                  <Button variant="secondary" size="sm" onClick={() => abort.current?.abort()}>
                    <Square className="size-3 fill-current" /> Cancel
                  </Button>
                )}
                <Button type="submit" disabled={!canSend} size="md">
                  {chamber.phase === 'paying' ? 'Paying…' : chamber.phase === 'sending' ? 'Sealing…' : seal ? 'Seal & send' : 'Send'}
                </Button>
              </div>
            </div>
          </form>

          {backendMode === 'unconfigured' && (
            <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13px] text-steel-400" role="note">
              Sending is disabled because no backend is configured. You can still compose a request.
            </p>
          )}

          <Panel title="Payment">
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="grid gap-3 lg:grid-cols-3 sm:grid-cols-1">
                <label
                  className={cn(
                    'relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition overflow-hidden',
                    method === 'trial' ? 'border-brand/40 bg-brand/[0.06] shadow-[0_0_20px_rgba(20,241,149,0.08)]' : 'border-white/[0.07] hover:border-white/15',
                    !hasFreeTrial && 'cursor-default opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={method === 'trial'}
                    disabled={!hasFreeTrial || busy}
                    onChange={() => setMethod('trial')}
                    className="mt-1 accent-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium text-steel-100">
                        <Sparkles className="size-4 text-brand" /> Free Trial
                      </span>
                      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand">
                        {remainingTrials > 0 ? `${remainingTrials} Left` : '0 Left'}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[12.5px] text-steel-400">
                      {account ? (
                        remainingTrials > 0 ? (
                          <>Complimentary inference. No USDC required.</>
                        ) : (
                          <>All 3 trial requests used. Use a prepaid key or wallet.</>
                        )
                      ) : (
                        <>Connect wallet to access 3 free requests.</>
                      )}
                    </span>
                    {!account && (
                      <span className="mt-3 block">
                        <WalletMenu align="left" />
                      </span>
                    )}
                  </span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                    method === 'key' ? 'border-white/25 bg-white/[0.04]' : 'border-white/[0.07] hover:border-white/15',
                    !key && 'cursor-default opacity-70',
                  )}
                >
                  <input type="radio" name="pay" checked={method === 'key'} disabled={!key || busy} onChange={() => setMethod('key')} className="mt-1 accent-steel-100" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13.5px] text-steel-100">
                      <KeyRound className="size-4 text-steel-400" /> Prepaid key
                    </span>
                    {key ? (
                      <span className="mt-1 block text-[12.5px] text-steel-500">
                        <span className="font-mono">{maskKey(key)}</span>
                        <br />
                        {balance.data
                          ? `${usdc(balance.data.balance_usdc)} left${price ? ` · ~${Math.floor(balance.data.balance_usdc / price).toLocaleString()} requests` : ''}`
                          : balance.isError ? 'Balance unavailable' : 'Checking balance…'}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[12.5px] text-steel-500">
                        None in this session. <Link className="text-steel-200 underline underline-offset-2" to="/app/keys">Buy or add a key</Link>
                      </span>
                    )}
                  </span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                    method === 'wallet' ? 'border-white/25 bg-white/[0.04]' : 'border-white/[0.07] hover:border-white/15',
                    !account && 'cursor-default',
                  )}
                >
                  <input type="radio" name="pay" checked={method === 'wallet'} disabled={!account || busy} onChange={() => setMethod('wallet')} className="mt-1 accent-steel-100" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13.5px] text-steel-100">
                      <Wallet className="size-4 text-steel-400" /> Wallet, pay per request
                    </span>
                    <span className="mt-1 block text-[12.5px] text-steel-500">
                      {account ? `${usdc(price)} USDC transfer per request.` : 'Connect a Solana wallet holding USDC.'}
                    </span>
                    {!account && (
                      <span className="mt-3 block">
                        <WalletMenu align="left" />
                      </span>
                    )}
                    {unusedPayment && method === 'wallet' && (
                      <span className="mt-2 block text-[12px] text-warn">Your last payment was not used. The next send reuses it.</span>
                    )}
                  </span>
                </label>
              </div>
            </fieldset>
          </Panel>

          <section className="surface rounded-2xl">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-[13.5px] font-medium text-steel-100">Advanced</span>
              <ChevronDown className={cn('size-4 text-steel-500 transition-transform', showAdvanced && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-white/[0.06] p-5">
                    <label htmlFor="extra" className="text-[13px] text-steel-200">Model parameters (JSON)</label>
                    <p className="mt-1 text-[12.5px] text-steel-500">
                      Supported: <code className="font-mono">temperature</code> (0–2), <code className="font-mono">max_tokens</code> (1–32768),{' '}
                      <code className="font-mono">top_p</code> (0–1). The gateway rejects out-of-range values before charging.
                    </p>
                    <textarea
                      id="extra"
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                      rows={4}
                      spellCheck={false}
                      placeholder='{ "temperature": 0.2, "max_tokens": 512 }'
                      aria-invalid={!extraParsed.ok}
                      className={cn(fieldClass, 'mt-3 py-3 font-mono text-[12.5px]', !extraParsed.ok && 'border-bad/40')}
                    />
                    {!extraParsed.ok && <p className="mt-2 text-[12.5px] text-bad">{extraParsed.msg}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div key={result.ok ? 'ok' : 'err'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                {result.ok ? (
                  <ResponsePanel data={result.data} view={view} setView={setView} receiptCheck={chamber.receipt?.check} />
                ) : (
                  <div role="alert" className="rounded-2xl border border-bad/20 bg-bad/[0.05] p-5">
                    <p className="font-medium text-bad">{result.error.title}</p>
                    <p className="mt-1 text-[13.5px] text-steel-300">{result.error.detail}</p>
                    {result.payment && method === 'key' && (
                      <ButtonLink to="/app/keys" size="sm" variant="secondary" className="mt-4">
                        <KeyRound className="size-3.5" /> Top up your key
                      </ButtonLink>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SealingChamber s={chamber} />
        </aside>
      </div>
    </>
  )
}

function ResponsePanel({
  data,
  view,
  setView,
  receiptCheck,
}: {
  data: ChatCompletionResult
  view: 'text' | 'raw'
  setView: (v: 'text' | 'raw') => void
  receiptCheck?: 'checking' | 'valid' | 'invalid' | 'unable'
}) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-3">
          Response
          {backendMode === 'mock' && <StatusTag tone="warn">Sample</StatusTag>}
          {data.sealed && <StatusTag tone="neutral" dot={false}>Sealed</StatusTag>}
        </span>
      }
      bodyClassName="p-0"
      actions={
        <div className="flex items-center gap-1" role="tablist" aria-label="Response view">
          {(['text', 'raw'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('rounded-full px-3 py-1 text-xs', view === v ? 'bg-white/[0.08] text-steel-50' : 'text-steel-500 hover:text-steel-200')}
            >
              {v === 'text' ? 'Output' : 'Raw JSON'}
            </button>
          ))}
        </div>
      }
    >
      {view === 'text' ? (
        data.text ? (
          <div className="relative">
            <p className="whitespace-pre-wrap p-5 pr-24 text-[15px] leading-[1.75] text-steel-100">{data.text}</p>
            <CopyButton value={data.text} label="Copy response" className="absolute right-4 top-4" />
          </div>
        ) : (
          <StatePanel kind="empty" title="No assistant text found">
            The response did not match the expected chat-completion shape. See Raw JSON.
          </StatePanel>
        )
      ) : (
        <div className="max-h-[420px] overflow-auto p-5">
          <Code code={JSON.stringify(data.raw, null, 2)} lang="json" />
        </div>
      )}
      {data.receipt && (
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-5 py-3.5">
          <ScanLine className="size-4 text-steel-400" />
          <span className="font-mono text-[12px] text-steel-300">{data.receipt.id}</span>
          {receiptCheck === 'valid' && <StatusTag tone="ok">Signature verified</StatusTag>}
          {receiptCheck === 'invalid' && <StatusTag tone="bad">Verification failed</StatusTag>}
          {receiptCheck === 'checking' && <StatusTag tone="info" pulse>Verifying</StatusTag>}
          <div className="ml-auto flex items-center gap-2">
            <CopyButton value={JSON.stringify(data.receipt, null, 2)} label="Copy receipt" />
            <ButtonLink to="/app/verify" state={{ receipt: JSON.stringify(data.receipt, null, 2) }} size="sm" variant="secondary">
              Inspect
            </ButtonLink>
          </div>
        </div>
      )}
    </Panel>
  )
}
