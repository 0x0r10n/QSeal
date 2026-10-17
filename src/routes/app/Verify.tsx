import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CircleHelp, CircleX, FileQuestion, Upload } from 'lucide-react'
import { PageHeader, Panel, fieldClass } from '@/components/application/ui'
import { Button } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { verificationConfigured, verifyReceipt, type VerificationOutcome } from '@/services/receipts'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

const OUTCOME = {
  valid: { icon: CircleCheck, tone: 'border-ok/25 bg-ok/[0.05]', text: 'text-ok', label: 'Valid' },
  invalid: { icon: CircleX, tone: 'border-bad/25 bg-bad/[0.05]', text: 'text-bad', label: 'Invalid' },
  unable: { icon: CircleHelp, tone: 'border-warn/25 bg-warn/[0.05]', text: 'text-warn', label: 'Unable to verify' },
  unsupported: { icon: FileQuestion, tone: 'border-white/12 bg-white/[0.03]', text: 'text-steel-200', label: 'Unsupported format' },
} as const

export default function Verify() {
  useDocumentTitle('Verify Receipt')
  const location = useLocation()
  const [text, setText] = useState<string>((location.state as { receipt?: string } | null)?.receipt ?? '')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function run() {
    setBusy(true)
    setOutcome(null)
    try {
      setOutcome(await verifyReceipt(text))
    } finally {
      setBusy(false)
    }
  }

  async function loadFile(f: File | undefined) {
    if (!f) return
    if (f.size > 2_000_000) {
      setOutcome({ status: 'unsupported', summary: 'Unsupported format', reason: 'File is larger than 2 MB.' })
      return
    }
    setText(await f.text())
    setOutcome(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Verify a receipt"
        description="Paste a receipt, a full API response, or a receipt ID. Its ML-DSA-65 and Ed25519 signatures are checked in your browser against the gateway’s published keys."
        actions={verificationConfigured() ? <StatusTag tone="ok">Gateway keys available</StatusTag> : <StatusTag tone="warn">No gateway connected</StatusTag>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Receipt" bodyClassName="p-0">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              void loadFile(e.dataTransfer.files[0])
            }}
            className={cn('relative transition', drag && 'bg-white/[0.03]')}
          >
            <label htmlFor="receipt" className="sr-only">Receipt JSON or receipt ID</label>
            <textarea
              id="receipt"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setOutcome(null)
              }}
              rows={16}
              spellCheck={false}
              placeholder={'Paste receipt JSON or a receipt ID (rcpt_…), or drop a .json file'}
              className={cn(fieldClass, 'block min-h-[360px] resize-y rounded-none border-0 bg-transparent px-5 py-5 font-mono text-[12.5px] leading-relaxed')}
            />
            {drag && (
              <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border border-dashed border-white/25 text-sm text-steel-200">
                Drop to load
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-4 py-3">
            <input ref={fileRef} type="file" accept="application/json,.json,.txt" className="hidden" onChange={(e) => void loadFile(e.target.files?.[0])} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" /> Load file
            </Button>
            {text && (
              <Button variant="ghost" size="sm" onClick={() => { setText(''); setOutcome(null) }}>
                Clear
              </Button>
            )}
            <Button className="ml-auto" onClick={() => void run()} disabled={!text.trim() || busy}>
              {busy ? 'Checking…' : 'Verify'}
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {outcome ? (
              <motion.div
                key={outcome.status + outcome.summary}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                role="status"
                aria-live="polite"
                className={cn('rounded-2xl border p-6', OUTCOME[outcome.status].tone)}
              >
                {(() => {
                  const O = OUTCOME[outcome.status]
                  return (
                    <>
                      <O.icon className={cn('size-7', O.text)} strokeWidth={1.5} />
                      <p className={cn('mt-4 text-lg font-medium', O.text)}>{O.label}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel-300">
                        {'reason' in outcome ? outcome.reason : 'Signed by this gateway and unaltered since it was issued.'}
                      </p>
                      {'details' in outcome && (
                        <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-[12.5px]">
                          {outcome.details.map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4">
                              <dt className="text-steel-500">{k}</dt>
                              <dd className="break-all text-right font-mono text-steel-200">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </>
                  )
                })()}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Panel title="Possible results">
                  <ul className="space-y-4">
                    {(Object.keys(OUTCOME) as Array<keyof typeof OUTCOME>).map((k) => {
                      const O = OUTCOME[k]
                      return (
                        <li key={k} className="flex gap-3">
                          <O.icon className={cn('mt-0.5 size-4 shrink-0', O.text)} strokeWidth={1.6} />
                          <div>
                            <p className="text-[13.5px] text-steel-100">{O.label}</p>
                            <p className="text-[12.5px] leading-relaxed text-steel-500">
                              {k === 'valid' && 'Both signatures check out against the gateway’s published keys.'}
                              {k === 'invalid' && 'A signature fails, the content was altered, or it was signed with other keys.'}
                              {k === 'unable' && 'The gateway’s keys could not be fetched, so nothing was checked.'}
                              {k === 'unsupported' && 'Not a QSeal receipt or receipt ID.'}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="px-1 text-[12px] leading-relaxed text-steel-600">
            Signatures are checked in this browser. The receipt is also sent to the gateway for its own check as a second opinion. Receipts hold hashes and payment details, never your prompt or the response.
          </p>
        </div>
      </div>
    </>
  )
}
