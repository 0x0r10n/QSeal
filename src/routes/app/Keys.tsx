import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { PageHeader, Panel, StatePanel, fieldClass } from '@/components/application/ui'
import { Button } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { useAccessKey } from '@/hooks/useAccessKey'
import { maskKey, setAccessKey } from '@/services/api/credentials'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/cn'

export default function Keys() {
  useDocumentTitle('Prepaid Keys')
  const key = useAccessKey()
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Prepaid keys"
        description="Use a prepaid key to call the API without signing a wallet transaction for each request."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Key for this session" actions={key ? <StatusTag tone="ok">Active</StatusTag> : <StatusTag tone="muted">None</StatusTag>}>
          {key ? (
            <div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-950/50 px-4 py-3">
                <KeyRound className="size-4 text-steel-400" />
                <span className="font-mono text-sm text-steel-100">{maskKey(key)}</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAccessKey(null)}>
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-steel-500">
                The full key is never shown again. It lives in this tab’s session storage and is cleared when the tab closes.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (value.trim()) {
                  setAccessKey(value.trim())
                  setValue('')
                  setShow(false)
                }
              }}
            >
              <label htmlFor="pk" className="text-[13px] text-steel-200">Prepaid key</label>
              <div className="relative mt-2">
                <input
                  id="pk"
                  type={show ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste key"
                  className={cn(fieldClass, 'h-11 pr-11 font-mono')}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide key' : 'Show key'}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-steel-500 hover:text-steel-100"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="mt-2 text-[12.5px] text-steel-500">Sent as a Bearer token to the configured backend. Never logged.</p>
              <Button type="submit" className="mt-5" disabled={!value.trim()}>Use this key</Button>
            </form>
          )}
        </Panel>

        <Panel title="Manage keys" bodyClassName="p-0">
          <StatePanel kind="unconfigured" title="Key management not connected">
            Creating, funding and listing prepaid keys requires API operations that have not been configured for this frontend. They
            will appear here once the contract is supplied.
          </StatePanel>
        </Panel>
      </div>
    </>
  )
}
