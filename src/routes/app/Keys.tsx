import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Eye, EyeOff, FlaskConical, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { ErrorState, PageHeader, Panel, Skeleton, StatePanel, fieldClass } from '@/components/application/ui'
import { WalletMenu } from '@/components/application/WalletMenu'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { CopyButton } from '@/components/ui/CodeBlock'
import { StatusTag } from '@/components/ui/StatusTag'
import { useAccessKey } from '@/hooks/useAccessKey'
import { useHealth, useKeyBalance } from '@/hooks/useGateway'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { isRemembered, looksLikeKey, maskKey, setAccessKey } from '@/services/api/credentials'
import { buyPrepaidKey, createDevKey, topUpKey } from '@/services/api/gateway'
import { describeError } from '@/services/api/errors'
import { payFromWallet, type PayStage } from '@/services/wallet/pay'
import { useWallet } from '@/services/wallet/wallet'
import { backendMode } from '@/lib/env'
import { formatDateTime } from '@/lib/format'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

const usdc = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC`
const STAGE: Record<PayStage | 'claiming', string> = {
  preparing: 'Preparing the transfer…',
  signing: 'Approve the transfer in your wallet…',
  confirming: 'Waiting for Solana confirmation…',
  claiming: 'Confirming the deposit with the gateway…',
}

type Busy = PayStage | 'claiming' | null

export default function Keys() {
  useDocumentTitle('Prepaid Keys')
  const key = useAccessKey()
  const health = useHealth()

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Prepaid keys"
        description="Fund a key once with USDC, then call the API without approving a wallet transaction for every request. Ideal for agents."
      />
      {backendMode !== 'live' ? (
        <Panel bodyClassName="p-0">
          <StatePanel kind="unconfigured" title="No backend connected">
            Set <code className="font-mono">VITE_QSEAL_API_URL</code> to buy and manage prepaid keys.
          </StatePanel>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {key ? <CurrentKey apiKey={key} /> : <AddKey />}
          <BuyKey minDeposit={health.data?.solana.min_prepaid_deposit_usdc ?? 1} network={health.data?.solana.network} hasKey={Boolean(key)} />
          {health.data?.mode === 'development' && <DevKey />}
        </div>
      )}
    </>
  )
}

function CurrentKey({ apiKey }: { apiKey: string }) {
  const balance = useKeyBalance()
  const { account } = useWallet()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('5')
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ signature: string; reference: string } | null>(null)
  const [remember, setRemember] = useState(isRemembered())

  async function claim(proof: { signature: string; reference: string }) {
    setBusy('claiming')
    try {
      await topUpKey(proof.signature, proof.reference)
      setPending(null)
      void queryClient.invalidateQueries({ queryKey: ['balance'] })
    } catch (e) {
      setPending(proof)
      setError(describeError(e).detail)
    } finally {
      setBusy(null)
    }
  }

  async function topUp() {
    if (!account) return
    setError(null)
    try {
      const paid = await payFromWallet(account.address, { kind: 'deposit', amountUsdc: Number(amount) }, setBusy)
      await claim(paid)
    } catch (e) {
      setBusy(null)
      setError(e instanceof Error ? describeError(e).detail : String(e))
    }
  }

  return (
    <Panel title="Your key" actions={<StatusTag tone="ok">Active</StatusTag>}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-950/50 px-4 py-3">
        <KeyRound className="size-4 text-steel-400" />
        <span className="font-mono text-sm text-steel-100">{maskKey(apiKey)}</span>
        <div className="ml-auto">
          <ConfirmButton onConfirm={() => setAccessKey(null)} confirmLabel="Remove? Click again">
            <Trash2 className="size-3.5" /> Remove
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-5">
        {balance.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : balance.isError ? (
          <ErrorState error={balance.error} />
        ) : (
          <dl className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <dt className="text-[12px] text-steel-500">Balance</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-steel-50">{usdc(balance.data.balance_usdc)}</dd>
              <dd className="mt-1 text-[12.5px] text-steel-500">About {balance.data.estimated_requests_remaining.toLocaleString()} requests at the default price</dd>
            </div>
            <Stat label="Spent" value={usdc(balance.data.total_spent_usdc)} />
            <Stat label="Requests" value={balance.data.total_requests.toLocaleString()} />
            <Stat label="Last used" value={formatDateTime(Date.parse(balance.data.last_used_at))} />
          </dl>
        )}
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <p className="text-[13px] font-medium text-steel-100">Top up from your wallet</p>
        {account ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="topup" className="sr-only">Amount in USDC</label>
            <div className="relative">
              <input
                id="topup"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className={cn(fieldClass, 'h-10 w-32 pr-14 font-mono')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-steel-500">USDC</span>
            </div>
            <Button onClick={() => void topUp()} disabled={Boolean(busy) || !(Number(amount) > 0)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add funds
            </Button>
          </div>
        ) : (
          <div className="mt-3 max-w-xs">
            <WalletMenu variant="block" align="left" />
          </div>
        )}
        {busy && <p className="mt-3 text-[12.5px] text-steel-400" aria-live="polite">{STAGE[busy]}</p>}
        {error && <p role="alert" className="mt-3 text-[12.5px] text-bad">{error}</p>}
        {pending && !busy && (
          <Recovery signature={pending.signature} onRetry={() => void claim(pending)} />
        )}
      </div>

      <label className="mt-5 flex items-start gap-3 border-t border-white/[0.06] pt-5 text-[13px] text-steel-300">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => {
            setRemember(e.target.checked)
            setAccessKey(apiKey, { remember: e.target.checked })
          }}
          className="mt-0.5 accent-steel-100"
        />
        <span>
          Remember this key on this device
          <span className="mt-0.5 block text-[12px] text-steel-500">Otherwise it is forgotten when you close this tab. Only enable on a device you trust.</span>
        </span>
      </label>
    </Panel>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-steel-500">{label}</dt>
      <dd className="mt-1 text-[13.5px] tabular-nums text-steel-100">{value}</dd>
    </div>
  )
}

function Recovery({ signature, onRetry }: { signature: string; onRetry: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-warn/25 bg-warn/[0.05] p-4">
      <p className="flex items-center gap-2 text-[13px] text-warn">
        <AlertTriangle className="size-4" /> Your payment was sent but not yet credited.
      </p>
      <p className="mt-1 break-all font-mono text-[11.5px] text-steel-400">{signature}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onRetry}>Retry</Button>
        <CopyButton value={signature} label="Copy signature" />
      </div>
      <p className="mt-2 text-[12px] text-steel-500">Keep this signature. You can claim with it later from “Already paid?”.</p>
    </div>
  )
}

function AddKey() {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const valid = looksLikeKey(value)
  return (
    <Panel title="Use an existing key">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setAccessKey(value.trim(), { remember })
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
            placeholder="qseal_sk_…"
            aria-invalid={Boolean(value) && !valid}
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
        {value && !valid && <p className="mt-2 text-[12.5px] text-bad">Keys look like qseal_sk_ followed by 48 hex characters.</p>}
        <label className="mt-4 flex items-center gap-2 text-[13px] text-steel-300">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-steel-100" />
          Remember on this device
        </label>
        <Button type="submit" className="mt-5" disabled={!valid}>Use this key</Button>
      </form>
    </Panel>
  )
}

function BuyKey({ minDeposit, network, hasKey }: { minDeposit: number; network?: string; hasKey: boolean }) {
  const { account } = useWallet()
  const [amount, setAmount] = useState(String(Math.max(5, minDeposit)))
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ signature: string; reference?: string } | null>(null)
  const [issued, setIssued] = useState<{ key: string; balance: number } | null>(null)
  const [manual, setManual] = useState('')
  const [remember, setRemember] = useState(false)
  const value = Number(amount)

  async function claim(proof: { signature: string; reference?: string }) {
    setBusy('claiming')
    setError(null)
    try {
      const res = await buyPrepaidKey(proof.signature, proof.reference)
      setPending(null)
      setIssued({ key: res.api_key, balance: res.balance_usdc })
    } catch (e) {
      setPending(proof)
      setError(describeError(e).detail)
    } finally {
      setBusy(null)
    }
  }

  async function buy() {
    if (!account) return
    setError(null)
    try {
      const paid = await payFromWallet(account.address, { kind: 'deposit', amountUsdc: value }, setBusy)
      await claim(paid)
    } catch (e) {
      setBusy(null)
      setError(describeError(e).detail)
    }
  }

  return (
    <Panel title={hasKey ? 'Buy another key' : 'Buy a key'} actions={network && <StatusTag tone={network === 'mainnet-beta' ? 'ok' : 'warn'}>{network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}</StatusTag>}>
      <AnimatePresence mode="wait">
        {issued ? (
          <motion.div key="issued" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="text-[13.5px] text-steel-100">Your key is ready with {usdc(issued.balance)}.</p>
            <p className="mt-1 text-[12.5px] text-warn">Copy it now. It is shown once and the gateway stores only a hash.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-steel-50">{issued.key}</code>
              <CopyButton value={issued.key} label="Copy key" />
            </div>
            <label className="mt-4 flex items-center gap-2 text-[13px] text-steel-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-steel-100" />
              Remember on this device
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                onClick={() => {
                  setAccessKey(issued.key, { remember })
                  setIssued(null)
                }}
              >
                Use this key now
              </Button>
              <Button variant="ghost" onClick={() => setIssued(null)}>Done</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[13px] leading-relaxed text-steel-400">
              Pays USDC from your wallet to the QSeal treasury. The key is credited with the amount that arrives on-chain. Minimum{' '}
              {usdc(minDeposit)}.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label htmlFor="deposit" className="sr-only">Deposit in USDC</label>
              <div className="relative">
                <input
                  id="deposit"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={cn(fieldClass, 'h-10 w-32 pr-14 font-mono')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-steel-500">USDC</span>
              </div>
              {account ? (
                <Button onClick={() => void buy()} disabled={Boolean(busy) || !(value >= minDeposit)}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Buy key
                </Button>
              ) : (
                <div className="w-full max-w-xs sm:w-auto">
                  <WalletMenu variant="block" align="left" />
                </div>
              )}
            </div>
            {value > 0 && value < minDeposit && <p className="mt-2 text-[12.5px] text-bad">The minimum deposit is {usdc(minDeposit)}.</p>}
            {busy && <p className="mt-3 text-[12.5px] text-steel-400" aria-live="polite">{STAGE[busy]}</p>}
            {error && <p role="alert" className="mt-3 text-[12.5px] text-bad">{error}</p>}
            {pending && !busy && <Recovery signature={pending.signature} onRetry={() => void claim(pending)} />}

            <details className="mt-6 border-t border-white/[0.06] pt-4">
              <summary className="cursor-pointer text-[13px] text-steel-300 hover:text-steel-100">Already paid? Claim with a transaction signature</summary>
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (manual.trim()) void claim({ signature: manual.trim() })
                }}
              >
                <label htmlFor="sig" className="sr-only">Transaction signature</label>
                <input
                  id="sig"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Solana transaction signature"
                  spellCheck={false}
                  className={cn(fieldClass, 'h-10 min-w-0 flex-1 font-mono text-[12px]')}
                />
                <Button type="submit" variant="secondary" disabled={!manual.trim() || Boolean(busy)}>Claim</Button>
              </form>
              <p className="mt-2 text-[12px] text-steel-500">
                For USDC sent to the treasury from another app within the last 15 minutes. Each payment can be claimed once.
              </p>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}

function DevKey() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Panel title={<span className="flex items-center gap-2"><FlaskConical className="size-4 text-warn" /> Development key</span>} className="lg:col-span-2">
      <div className="flex flex-wrap items-center gap-4">
        <p className="flex-1 text-[13px] text-steel-400">
          This gateway runs in development mode, so it can issue a free test key with 5 USDC of credit. Production gateways never do this.
        </p>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              const res = await createDevKey(5)
              setAccessKey(res.api_key)
            } catch (e) {
              setError(describeError(e).detail)
            } finally {
              setBusy(false)
            }
          }}
        >
          Create a test key
        </Button>
      </div>
      {error && <p role="alert" className="mt-3 text-[12.5px] text-bad">{error}</p>}
    </Panel>
  )
}
