import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Boxes, KeyRound, Plus, ScanLine, Wallet } from 'lucide-react'
import { PageHeader, Panel, Skeleton, StatePanel, ErrorState } from '@/components/application/ui'
import { BackendStatusPill } from '@/components/application/BackendStatus'
import { ButtonLink } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { QEmblem } from '@/components/brand/QEmblem'
import { HistoryList } from '@/features/history/HistoryList'
import { useHistory } from '@/features/history/store'
import { useModels } from '@/hooks/useModels'
import { useAccessKey } from '@/hooks/useAccessKey'
import { useHealth, useKeyBalance } from '@/hooks/useGateway'
import { shortAddress, useWallet } from '@/services/wallet/wallet'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { backendMode, env } from '@/lib/env'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const history = useHistory()
  const models = useModels()
  const key = useAccessKey()
  const health = useHealth()
  const balance = useKeyBalance()
  const { account } = useWallet()
  const local = history.filter((e) => !e.sample || backendMode === 'mock')
  const completed = local.filter((e) => e.status === 'completed').length
  const failed = local.filter((e) => e.status === 'failed').length

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={greeting()}
        description="Run private inference, keep the receipts, and verify them later."
        actions={
          <>
            <ButtonLink to="/app/verify" variant="secondary">
              <ScanLine className="size-4" /> Verify receipt
            </ButtonLink>
            <ButtonLink to="/app/new">
              <Plus className="size-4" /> New request
            </ButtonLink>
          </>
        }
      />

      <Reveal className="grid gap-4 lg:grid-cols-3" gap={0.06}>
        {/* Hero action */}
        <RevealItem className="lg:col-span-2">
          <Link
            to="/app/new"
            className="group surface-raised relative flex min-h-[220px] overflow-hidden rounded-2xl p-6 sm:p-8"
          >
            <div aria-hidden className="pinstripes absolute inset-0 opacity-60" />
            <div aria-hidden className="absolute -right-10 -top-6 opacity-40 transition duration-700 group-hover:scale-105 group-hover:opacity-60">
              <QEmblem className="h-64 w-auto" />
            </div>
            <div className="relative flex flex-col justify-between">
              <div>
                <p className="eyebrow">Sealing chamber</p>
                <h2 className="mt-4 max-w-sm text-2xl font-medium tracking-[-0.03em] text-steel-50 sm:text-[28px]">
                  Compose a new inference request
                </h2>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-sm text-steel-200">
                Open composer <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </RevealItem>

        {/* Connection */}
        <RevealItem>
          <Panel title="Connection" actions={<BackendStatusPill />} className="h-full">
            <dl className="space-y-4 text-[13px]">
              <div>
                <dt className="text-steel-500">Gateway</dt>
                <dd className="mt-1 truncate font-mono text-[12px] text-steel-200">{env.apiUrl ?? 'Not configured'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-steel-500">Network</dt>
                  <dd className="mt-1 text-steel-200">
                    {health.data ? (health.data.solana.network === 'mainnet-beta' ? 'Solana mainnet' : 'Solana devnet') : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-steel-500">Models</dt>
                  <dd className="mt-1 text-steel-200">
                    {backendMode === 'unconfigured' ? '—' : models.isPending ? <Skeleton className="h-4 w-10" /> : models.isError ? 'Unavailable' : models.data.length}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-steel-500">Model provider</dt>
                <dd className="mt-1 text-steel-200">
                  {health.data ? (health.data.upstream.active ? health.data.upstream.provider : health.data.upstream.provider === 'dev-engine' ? 'Dev echo engine (not a model)' : 'None configured') : '—'}
                </dd>
              </div>
            </dl>
          </Panel>
        </RevealItem>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Recent requests"
          bodyClassName="p-0"
          actions={
            local.length > 0 && (
              <Link to="/app/history" className="text-[12.5px] text-steel-400 hover:text-steel-100">
                View all
              </Link>
            )
          }
        >
          {local.length === 0 ? (
            <StatePanel kind="empty" title="No requests yet" action={<ButtonLink to="/app/new" size="sm">New request</ButtonLink>}>
              Requests you send from this browser appear here.
            </StatePanel>
          ) : (
            <HistoryList entries={local.slice(0, 6)} compact />
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel
            title="Usage"
            actions={<span className="font-mono text-[10.5px] text-steel-600">{balance.data ? 'Prepaid key' : 'This browser'}</span>}
          >
            {balance.data ? (
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ['Balance', `${balance.data.balance_usdc.toFixed(3)}`],
                  ['Spent', `${balance.data.total_spent_usdc.toFixed(3)}`],
                  ['Requests', balance.data.total_requests.toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11.5px] text-steel-500">{k}{k !== 'Requests' && ' (USDC)'}</dt>
                    <dd className="mt-1 text-xl font-medium tabular-nums tracking-tight text-steel-50">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : local.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-steel-500">
                Add a prepaid key to see its balance and spend. Requests you send from this browser are counted here too.
              </p>
            ) : (
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ['Sent', local.length],
                  ['Completed', completed],
                  ['Failed', failed],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11.5px] text-steel-500">{k}</dt>
                    <dd className="mt-1 text-2xl font-medium tabular-nums tracking-tight text-steel-50">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Payments">
            <ul className="space-y-3 text-[13px]">
              <li className="flex items-center gap-3">
                <Wallet className="size-4 text-steel-500" />
                <span className="flex-1 text-steel-300">Solana wallet</span>
                {account ? <StatusTag tone="ok">{shortAddress(account.address)}</StatusTag> : <StatusTag tone="muted">Not connected</StatusTag>}
              </li>
              <li className="flex items-center gap-3">
                <KeyRound className="size-4 text-steel-500" />
                <span className="flex-1 text-steel-300">Prepaid key</span>
                {key ? (
                  <StatusTag tone={balance.data && balance.data.balance_usdc < 0.01 ? 'warn' : 'ok'}>
                    {balance.data ? `${balance.data.balance_usdc.toFixed(2)} USDC` : 'Active'}
                  </StatusTag>
                ) : (
                  <Link to="/app/keys" className="text-[12.5px] text-steel-300 underline underline-offset-2 hover:text-white">Buy a key</Link>
                )}
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Model availability"
        bodyClassName="p-0"
        actions={
          <Link to="/app/models" className="inline-flex items-center gap-1 text-[12.5px] text-steel-400 hover:text-steel-100">
            Catalogue <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        {backendMode === 'unconfigured' ? (
          <StatePanel kind="unconfigured" title="Not connected">
            The model catalogue loads from <code className="font-mono">GET /v1/models</code> once a backend is configured.
          </StatePanel>
        ) : models.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : models.isError ? (
          <ErrorState error={models.error} />
        ) : models.data.length === 0 ? (
          <StatePanel kind="empty" title="No models listed">The backend returned an empty catalogue.</StatePanel>
        ) : (
          <ul className="flex flex-wrap gap-2 p-5">
            {models.data.slice(0, 12).map((m) => (
              <li key={m.id} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-[12px] text-steel-200">
                <Boxes className="size-3.5 text-steel-500" /> {m.id}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
