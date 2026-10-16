import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, CornerDownLeft, KeyRound, Square, Wallet } from 'lucide-react'
import { PageHeader, Panel, StatePanel, fieldClass } from '@/components/application/ui'
import { Button } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { SealingChamber, type ChamberState } from '@/features/request/SealingChamber'
import { historyStore, newId } from '@/features/history/store'
import { useModels } from '@/hooks/useModels'
import { useAccessKey } from '@/hooks/useAccessKey'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { createChatCompletion } from '@/services/api/chat'
import { ApiError, describeError } from '@/services/api/errors'
import { extractReceipt } from '@/services/receipts'
import { maskKey } from '@/services/api/credentials'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'
import type { ChatCompletionResult, ChatMessage } from '@/types/api'

type Result = { ok: true; data: ChatCompletionResult } | { ok: false; error: { title: string; detail: string } }

export default function NewRequest() {
  useDocumentTitle('New Request')
  const models = useModels()
  const key = useAccessKey()
  const [model, setModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [system, setSystem] = useState('')
  const [showSystem, setShowSystem] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extra, setExtra] = useState('')
  const [chamber, setChamber] = useState<ChamberState>({ phase: 'idle', ready: false })
  const [result, setResult] = useState<Result | null>(null)
  const [view, setView] = useState<'text' | 'raw'>('text')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!model && models.data?.length) setModel(models.data[0].id)
  }, [models.data, model])

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

  const ready = Boolean(model && prompt.trim())
  const sending = chamber.phase === 'sending'
  const canSend = ready && !sending && extraParsed.ok && backendMode !== 'unconfigured'

  useEffect(() => {
    setChamber((c) => (c.phase === 'idle' ? { ...c, ready } : c))
  }, [ready])

  useEffect(() => () => abort.current?.abort(), [])

  async function send() {
    if (!canSend || !extraParsed.ok) return
    const messages: ChatMessage[] = [
      ...(system.trim() ? [{ role: 'system' as const, content: system.trim() }] : []),
      { role: 'user', content: prompt.trim() },
    ]
    const id = newId()
    const startedAt = performance.now()
    historyStore.add({ id, createdAt: Date.now(), model, prompt: prompt.trim(), system: system.trim() || undefined, status: 'pending', sample: backendMode === 'mock' })
    setResult(null)
    setChamber({ phase: 'sending', ready: true, startedAt })
    abort.current = new AbortController()
    try {
      const data = await createChatCompletion({ model, messages, extra: extraParsed.value }, abort.current.signal)
      const receipt = extractReceipt(data.raw, data.headers)
      historyStore.update(id, {
        status: 'completed',
        responseText: data.text,
        responseRaw: data.raw,
        responseId: data.id,
        httpStatus: data.status,
        latencyMs: data.latencyMs,
        receipt,
      })
      setResult({ ok: true, data })
      setView(data.text ? 'text' : 'raw')
      setChamber({ phase: 'done', ready: true, latencyMs: data.latencyMs, httpStatus: data.status, receiptFound: receipt != null })
    } catch (e) {
      const err = describeError(e)
      const cancelled = e instanceof ApiError && e.kind === 'aborted'
      historyStore.update(id, {
        status: cancelled ? 'cancelled' : 'failed',
        error: err,
        httpStatus: e instanceof ApiError ? e.status : undefined,
        responseRaw: e instanceof ApiError ? e.body : undefined,
        latencyMs: performance.now() - startedAt,
      })
      setResult(cancelled ? null : { ok: false, error: err })
      setChamber({ phase: cancelled ? 'cancelled' : 'error', ready: true, errorTitle: err.title })
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
        description="Compose a chat completion. Only the model and messages are sent unless you add fields under Advanced."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
            className="surface overflow-hidden rounded-2xl"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <label htmlFor="model" className="sr-only">Model</label>
              <div className="relative">
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={modelOptions.length === 0 || sending}
                  className={cn(fieldClass, 'h-9 min-w-[200px] appearance-none pr-9 font-mono text-[12.5px]')}
                >
                  {modelOptions.length === 0 && (
                    <option value="">
                      {backendMode === 'unconfigured' ? 'No backend configured' : models.isPending ? 'Loading models…' : models.isError ? 'Models unavailable' : 'No models'}
                    </option>
                  )}
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.id}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
              </div>
              <StatusTag tone="neutral" dot={false}>Chat completion</StatusTag>
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
                    disabled={sending}
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
              disabled={sending}
              rows={10}
              placeholder="Ask anything. Your request is sent only when you press Seal & send."
              className="block min-h-[240px] w-full resize-y bg-transparent px-5 py-5 text-[15.5px] leading-[1.7] text-steel-50 placeholder:text-steel-600 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-4 py-3">
              <span className="font-mono text-[11px] text-steel-600 tabular-nums">{prompt.length.toLocaleString()} chars</span>
              <span className="hidden items-center gap-1 font-mono text-[11px] text-steel-600 sm:inline-flex">
                <CornerDownLeft className="size-3" /> ⌘/Ctrl + Enter
              </span>
              <div className="ml-auto flex items-center gap-2">
                {sending && (
                  <Button variant="secondary" size="sm" onClick={() => abort.current?.abort()}>
                    <Square className="size-3 fill-current" /> Cancel
                  </Button>
                )}
                <Button type="submit" disabled={!canSend} size="md">
                  {sending ? 'Sealing…' : 'Seal & send'}
                </Button>
              </div>
            </div>
          </form>

          {backendMode === 'unconfigured' && (
            <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13px] text-steel-400" role="note">
              Sending is disabled because no backend is configured. You can still compose a request.
            </p>
          )}

          {/* Payment */}
          <Panel title="Payment & access">
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition', key ? 'border-white/20 bg-white/[0.04]' : 'border-white/[0.07]')}>
                  <input type="radio" name="pay" checked={Boolean(key)} readOnly disabled={!key} className="mt-1 accent-steel-100" />
                  <span>
                    <span className="flex items-center gap-2 text-[13.5px] text-steel-100">
                      <KeyRound className="size-4 text-steel-400" /> Prepaid key
                    </span>
                    <span className="mt-1 block text-[12.5px] text-steel-500">
                      {key ? <span className="font-mono">{maskKey(key)}</span> : <>None set. <Link className="underline underline-offset-2" to="/app/keys">Add one</Link></>}
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-white/[0.07] p-4 opacity-60">
                  <input type="radio" name="pay" disabled className="mt-1" />
                  <span>
                    <span className="flex items-center gap-2 text-[13.5px] text-steel-100">
                      <Wallet className="size-4 text-steel-400" /> Solana wallet
                    </span>
                    <span className="mt-1 block text-[12.5px] text-steel-500">Not configured for this deployment</span>
                  </span>
                </label>
              </div>
              {!key && <p className="mt-3 text-[12.5px] text-steel-500">Without a key, the request is sent with no Authorization header.</p>}
            </fieldset>
          </Panel>

          {/* Advanced */}
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
                    <label htmlFor="extra" className="text-[13px] text-steel-200">Additional request fields (JSON)</label>
                    <p className="mt-1 text-[12.5px] text-steel-500">
                      No optional parameters are confirmed for this backend. Anything here is merged into the request body as-is.
                    </p>
                    <textarea
                      id="extra"
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                      rows={4}
                      spellCheck={false}
                      placeholder="{ }"
                      aria-invalid={!extraParsed.ok}
                      className={cn(fieldClass, 'mt-3 py-3 font-mono text-[12.5px]', !extraParsed.ok && 'border-bad/40')}
                    />
                    {!extraParsed.ok && <p className="mt-2 text-[12.5px] text-bad">{extraParsed.msg}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div key={result.ok ? 'ok' : 'err'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                {result.ok ? (
                  <Panel
                    title={
                      <span className="flex items-center gap-3">
                        Response
                        {backendMode === 'mock' && <StatusTag tone="warn">Sample</StatusTag>}
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
                      result.data.text ? (
                        <div className="relative">
                          <p className="whitespace-pre-wrap p-5 text-[15px] leading-[1.75] text-steel-100">{result.data.text}</p>
                          <CopyButton value={result.data.text} label="Copy response" className="absolute right-4 top-4" />
                        </div>
                      ) : (
                        <StatePanel kind="empty" title="No assistant text found">
                          The response did not match the expected chat-completion shape. See Raw JSON.
                        </StatePanel>
                      )
                    ) : (
                      <div className="relative max-h-[420px] overflow-auto p-5">
                        <Code code={JSON.stringify(result.data.raw, null, 2)} lang="json" />
                      </div>
                    )}
                  </Panel>
                ) : (
                  <div role="alert" className="rounded-2xl border border-bad/20 bg-bad/[0.05] p-5">
                    <p className="font-medium text-bad">{result.error.title}</p>
                    <p className="mt-1 text-[13.5px] text-steel-300">{result.error.detail}</p>
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
