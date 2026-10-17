import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader, Panel } from '@/components/application/ui'
import { BackendStatusPill } from '@/components/application/BackendStatus'
import { WalletMenu } from '@/components/application/WalletMenu'
import { useHealth } from '@/hooks/useGateway'
import { Button, ButtonLink } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { useBackendStatus } from '@/hooks/useModels'
import { setPrefs, usePrefs, type Prefs } from '@/hooks/usePrefs'
import { useAccessKey } from '@/hooks/useAccessKey'
import { historyStore, useHistory } from '@/features/history/store'
import { maskKey } from '@/services/api/credentials'
import { describeError } from '@/services/api/errors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { backendMode, env } from '@/lib/env'
import { cn } from '@/lib/cn'

function Row({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[13.5px] text-steel-100">{label}</p>
        {hint && <p className="mt-0.5 text-[12.5px] text-steel-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-white/10 p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn('h-7 rounded-full px-3 text-[12.5px] transition', value === v ? 'bg-white/[0.1] text-steel-50' : 'text-steel-400 hover:text-steel-100')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export default function Settings() {
  useDocumentTitle('Settings')
  const { hash } = useLocation()
  const prefs = usePrefs()
  const key = useAccessKey()
  const history = useHistory()
  const status = useBackendStatus()
  const health = useHealth()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Configuration for this browser and the connected backend." />
      <div className="grid gap-4">
        <div id="backend" className="scroll-mt-20">
          <Panel title="Network" actions={<BackendStatusPill />}>
            <Row label="Backend URL" hint="Set at build time with VITE_QROUTER_API_URL. Not editable here.">
              <code className="block max-w-[320px] truncate rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-[12px] text-steel-200">
                {env.apiUrl ?? (env.apiUrlInvalid ? 'Invalid value' : 'Not configured')}
              </code>
            </Row>
            <Row label="Mode" hint={backendMode === 'mock' ? 'Development sample data. Disabled in production builds.' : undefined}>
              <StatusTag tone={backendMode === 'live' ? 'ok' : backendMode === 'mock' ? 'warn' : 'muted'}>
                {backendMode === 'live' ? 'Live' : backendMode === 'mock' ? 'Sample data' : 'Unconfigured'}
              </StatusTag>
            </Row>
            {health.data && (
              <>
                <Row label="Solana network" hint={`USDC to ${health.data.solana.payTo.slice(0, 6)}…${health.data.solana.payTo.slice(-4)}`}>
                  <StatusTag tone={health.data.solana.network === 'mainnet-beta' ? 'ok' : 'warn'}>
                    {health.data.solana.network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
                  </StatusTag>
                </Row>
                <Row label="Model provider">
                  <span className="font-mono text-[12.5px] text-steel-300">
                    {health.data.upstream.active ? health.data.upstream.provider : health.data.upstream.provider === 'dev-engine' ? 'dev echo engine' : 'none'}
                  </span>
                </Row>
                <Row label="Gateway mode" hint={health.data.mode === 'development' ? 'Free test keys and simulated payments are enabled.' : undefined}>
                  <StatusTag tone={health.data.mode === 'production' ? 'ok' : 'warn'}>{health.data.mode}</StatusTag>
                </Row>
              </>
            )}
            <Row label="Request timeout">
              <span className="font-mono text-[12.5px] text-steel-300">{Math.round(env.timeoutMs / 1000)} s</span>
            </Row>
            {backendMode === 'live' && (
              <Row label="Connection test" hint={status.status === 'unreachable' ? describeError(status.error).detail : 'Calls GET /health.'}>
                <Button variant="secondary" size="sm" onClick={status.refetch}>
                  <RefreshCw className="size-3.5" /> Test
                </Button>
              </Row>
            )}
          </Panel>
        </div>

        <div id="account" className="scroll-mt-20">
          <Panel title="Account">
            <Row label="Prepaid key" hint={key ? 'Stored for this tab only.' : 'No key in this session.'}>
              {key ? <span className="font-mono text-[12.5px] text-steel-200">{maskKey(key)}</span> : <ButtonLink to="/app/keys" size="sm" variant="secondary">Add key</ButtonLink>}
            </Row>
            <Row label="Accounts" hint="QRouter has no username or password. Your wallet and prepaid keys are your identity.">
              <StatusTag tone="neutral" dot={false}>Accountless</StatusTag>
            </Row>
          </Panel>
        </div>

        <div id="wallet" className="scroll-mt-20">
          <Panel title="Wallet">
            <Row label="Solana wallet" hint="Used to pay per request and to buy or top up prepaid keys. QRouter never holds your wallet keys.">
              <div className="w-64">
                <WalletMenu variant="block" />
              </div>
            </Row>
          </Panel>
        </div>

        <Panel title="Preferences">
          <Row label="Motion" hint="Override the system’s reduced-motion setting.">
            <Segmented<Prefs['motion']>
              label="Motion preference"
              value={prefs.motion}
              onChange={(motion) => setPrefs({ motion })}
              options={[['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']]}
            />
          </Row>
          <Row label="Sidebar" hint="Desktop sidebar width.">
            <Segmented
              label="Sidebar"
              value={prefs.sidebarCollapsed ? 'c' : 'e'}
              onChange={(v) => setPrefs({ sidebarCollapsed: v === 'c' })}
              options={[['e', 'Expanded'], ['c', 'Compact']]}
            />
          </Row>
        </Panel>

        <Panel title="Local data">
          <Row label="Request history" hint={`${history.length} request${history.length === 1 ? '' : 's'} stored in this browser.`}>
            <ConfirmButton variant="danger" disabled={history.length === 0} onConfirm={() => historyStore.clear()} confirmLabel="Click again to clear">
              Clear history
            </ConfirmButton>
          </Row>
        </Panel>
      </div>
    </>
  )
}
