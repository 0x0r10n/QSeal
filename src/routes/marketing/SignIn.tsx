import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, ArrowRight, KeyRound, Loader2 } from 'lucide-react'
import { QEmblem } from '@/components/brand/QEmblem'
import { Button } from '@/components/ui/Button'
import { WalletMenu } from '@/components/application/WalletMenu'
import { looksLikeKey, setAccessKey } from '@/services/api/credentials'
import { connectWallet, useWallet } from '@/services/wallet/wallet'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { EASE } from '@/lib/motion'

export default function SignIn() {
  useDocumentTitle('Sign In')
  const navigate = useNavigate()
  const location = useLocation()
  const [key, setKey] = useState('')
  const [connectErr, setConnectErr] = useState<string | null>(null)
  const { available, account, connecting, connectingWalletName, error: globalError } = useWallet()

  // Target path user originally tried to access
  const target = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app'

  useEffect(() => {
    if (account) {
      navigate(target, { replace: true })
    }
  }, [account, navigate, target])

  const phantomWallet = available.find((w) => w.name.toLowerCase().includes('phantom'))
  const solflareWallet = available.find((w) => w.name.toLowerCase().includes('solflare'))
  const otherWallets = available.filter(
    (w) => !w.name.toLowerCase().includes('phantom') && !w.name.toLowerCase().includes('solflare'),
  )

  const handleDirectConnect = async (wallet: typeof phantomWallet) => {
    if (!wallet) return
    setConnectErr(null)
    try {
      await connectWallet(wallet)
    } catch (e) {
      setConnectErr(e instanceof Error ? e.message : 'The wallet refused the connection')
    }
  }

  const activeError = connectErr || globalError

  return (
    <section className="grain relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-5 pb-20 pt-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,#1a1a1f,#060607_70%)]" />
      <div aria-hidden className="pinstripes mask-radial absolute inset-0 -z-10" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE }}
        className="surface-raised w-full max-w-[440px] rounded-[28px] p-8 sm:p-10"
      >
        <QEmblem className="h-12 w-auto" />
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-steel-50">Sign in to QRouter</h1>
        <p className="mt-2 text-[15px] text-steel-400">Connect a wallet, or continue with a prepaid key.</p>

        <div className="mt-8 space-y-3">
          {/* Direct connect button if Phantom is found */}
          {phantomWallet ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => handleDirectConnect(phantomWallet)}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-medium text-steel-50 shadow-sm transition hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50"
            >
              {connecting && connectingWalletName?.toLowerCase().includes('phantom') ? (
                <Loader2 className="size-4 animate-spin text-steel-400" />
              ) : (
                <img src={phantomWallet.icon} alt="" className="size-5 rounded" />
              )}
              <span>
                {connecting && connectingWalletName?.toLowerCase().includes('phantom')
                  ? 'Connecting to Phantom…'
                  : 'Connect Phantom'}
              </span>
            </button>
          ) : null}

          {/* Direct connect button if Solflare is found */}
          {solflareWallet && !phantomWallet ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => handleDirectConnect(solflareWallet)}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-medium text-steel-50 shadow-sm transition hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50"
            >
              {connecting && connectingWalletName?.toLowerCase().includes('solflare') ? (
                <Loader2 className="size-4 animate-spin text-steel-400" />
              ) : (
                <img src={solflareWallet.icon} alt="" className="size-5 rounded" />
              )}
              <span>
                {connecting && connectingWalletName?.toLowerCase().includes('solflare')
                  ? 'Connecting to Solflare…'
                  : 'Connect Solflare'}
              </span>
            </button>
          ) : null}

          {/* Secondary / alternative wallet menu */}
          {(otherWallets.length > 0 || (phantomWallet && solflareWallet) || available.length === 0) && (
            <WalletMenu variant="block" align="left" />
          )}

          {/* Status banner when extension popup is open or waiting for user unlock */}
          {connecting && (
            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-steel-300">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-steel-400" />
              <div>
                <p className="font-medium text-steel-200">
                  Waiting for {connectingWalletName || 'Phantom'} approval
                </p>
                <p className="mt-0.5 text-steel-400">
                  Please check the extension popup window to unlock your wallet and approve the connection.
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {activeError && !connecting && (
            <div className="flex items-start gap-2.5 rounded-xl border border-bad/20 bg-bad/5 p-3 text-xs leading-relaxed text-bad">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Connection attempt failed</p>
                <p className="mt-0.5 text-steel-400">{activeError}</p>
              </div>
            </div>
          )}

          {account && (
            <Button size="lg" className="w-full" onClick={() => navigate(target)}>
              Continue to the app <ArrowRight className="size-4" />
            </Button>
          )}

          <p className="text-[12px] leading-relaxed text-steel-500">
            No account or password. Your wallet pays per request or buys a prepaid key. QRouter never holds your wallet keys.
          </p>
        </div>

        <div className="my-7 flex items-center gap-4 text-xs text-steel-600">
          <span className="h-px flex-1 bg-white/[0.07]" /> or <span className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (looksLikeKey(key)) {
              setAccessKey(key.trim())
              navigate(target, { replace: true })
            }
          }}
        >
          <label htmlFor="key" className="flex items-center gap-2 text-sm font-medium text-steel-200">
            <KeyRound className="size-4 text-steel-400" /> Prepaid key
          </label>
          <input
            id="key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your prepaid key"
            className="mt-2.5 h-12 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 font-mono text-sm text-steel-50 placeholder:text-steel-600 focus:border-white/30 focus:outline-none"
          />
          {key && !looksLikeKey(key) && (
            <p className="mt-2 text-xs text-bad">Key format invalid. Enter a valid prepaid key or connect a wallet above.</p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-steel-600">
            Saved securely for this session and sent to the gateway as authorization.
          </p>
          <Button type="submit" size="lg" disabled={!looksLikeKey(key)} className="mt-6 w-full">
            Continue with key <ArrowRight className="size-4" />
          </Button>
        </form>
      </motion.div>
    </section>
  )
}
