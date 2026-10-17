import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader, Panel, StatePanel } from '@/components/application/ui'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Code, CopyButton } from '@/components/ui/CodeBlock'
import { StatusTag } from '@/components/ui/StatusTag'
import { RequestStatusTag } from '@/features/history/status'
import { historyStore, useHistory } from '@/features/history/store'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime, formatMs } from '@/lib/format'

export default function HistoryDetail() {
  useDocumentTitle('Request')
  const { id } = useParams()
  const navigate = useNavigate()
  const entry = useHistory().find((e) => e.id === id)

  if (!entry) {
    return (
      <Panel>
        <StatePanel kind="empty" title="Request not found" action={<ButtonLink to="/app/history" size="sm" variant="secondary">Back to history</ButtonLink>}>
          It may have been cleared, or it was sent from another browser.
        </StatePanel>
      </Panel>
    )
  }

  return (
    <>
      <ButtonLink to="/app/history" variant="ghost" size="sm" className="-ml-3 mb-4">
        <ArrowLeft className="size-4" /> History
      </ButtonLink>
      <PageHeader
        title="Request details"
        description={<span className="font-mono text-[12px]">{entry.id}</span>}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                historyStore.remove(entry.id)
                navigate('/app/history')
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
            <ButtonLink to="/app/new" variant="secondary" size="sm">
              <RotateCcw className="size-3.5" /> New request
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {entry.system && (
            <Panel title="System prompt">
              <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-steel-300">{entry.system}</p>
            </Panel>
          )}
          <Panel title="Prompt" actions={<CopyButton value={entry.prompt} label="Copy prompt" />}>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-steel-100">{entry.prompt}</p>
          </Panel>
          {entry.status === 'completed' && (
            <Panel title="Response" actions={entry.responseText ? <CopyButton value={entry.responseText} label="Copy response" /> : undefined}>
              {entry.responseText ? (
                <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-steel-100">{entry.responseText}</p>
              ) : (
                <p className="text-[13.5px] text-steel-500">No assistant text in the response. See the raw payload below.</p>
              )}
            </Panel>
          )}
          {entry.error && (
            <div role="alert" className="rounded-2xl border border-bad/20 bg-bad/[0.05] p-5">
              <p className="font-medium text-bad">{entry.error.title}</p>
              <p className="mt-1 text-[13.5px] text-steel-300">{entry.error.detail}</p>
            </div>
          )}
          {entry.responseRaw !== undefined && (
            <Panel title="Raw payload" bodyClassName="max-h-[420px] overflow-auto">
              <Code code={JSON.stringify(entry.responseRaw, null, 2) ?? String(entry.responseRaw)} lang="json" />
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Summary">
            <dl className="space-y-4 text-[13px]">
              <Row k="Status" v={<RequestStatusTag status={entry.status} />} />
              <Row k="Model" v={<span className="font-mono text-[12px]">{entry.model}</span>} />
              <Row k="Sent" v={formatDateTime(entry.createdAt)} />
              <Row k="HTTP" v={entry.httpStatus ?? '—'} />
              <Row k="Latency" v={entry.latencyMs ? formatMs(entry.latencyMs) : '—'} />
              <Row k="Paid with" v={entry.payment === 'wallet' ? 'Wallet' : entry.payment === 'key' ? 'Prepaid key' : '—'} />
              <Row k="Sealed prompt" v={entry.sealed ? 'Yes' : 'No'} />
              {entry.responseId && <Row k="Response ID" v={<span className="break-all font-mono text-[11.5px]">{entry.responseId}</span>} />}
              {entry.sample && <Row k="Source" v={<StatusTag tone="warn">Sample data</StatusTag>} />}
            </dl>
          </Panel>
          <Panel
            title="Receipt"
            actions={
              entry.receiptCheck === 'valid' ? <StatusTag tone="ok">Verified</StatusTag>
                : entry.receiptCheck === 'invalid' ? <StatusTag tone="bad">Failed</StatusTag>
                  : undefined
            }
          >
            {entry.receipt ? (
              <>
                <dl className="space-y-3 text-[13px]">
                  <Row k="ID" v={<span className="break-all font-mono text-[11.5px]">{entry.receipt.id}</span>} />
                  <Row k="Tokens" v={entry.receipt.tokens.totalTokens} />
                  <Row k="Paid" v={`${entry.receipt.payment.amountUsdc} USDC`} />
                  <Row k="Method" v={entry.receipt.payment.type} />
                  <Row k="Sealed" v={entry.receipt.sealed ? 'Yes' : 'No'} />
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink to="/app/verify" state={{ receipt: JSON.stringify(entry.receipt, null, 2) }} size="sm">
                    Verify receipt
                  </ButtonLink>
                  <CopyButton value={JSON.stringify(entry.receipt, null, 2)} label="Copy receipt" />
                </div>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-steel-500">
                {entry.status === 'completed' ? 'The response did not include a receipt.' : 'No receipt: the request did not complete.'}
              </p>
            )}
          </Panel>
          {entry.paymentSignature && (
            <Panel title="Payment">
              <p className="text-[12.5px] text-steel-500">Solana transaction</p>
              <p className="mt-1 break-all font-mono text-[11.5px] text-steel-300">{entry.paymentSignature}</p>
            </Panel>
          )}
        </aside>
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-steel-500">{k}</dt>
      <dd className="text-right text-steel-200">{v}</dd>
    </div>
  )
}
