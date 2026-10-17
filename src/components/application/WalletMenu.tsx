import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ChevronDown, Loader2, LogOut, Wallet } from 'lucide-react'
import { connectWallet, disconnectWallet, refreshWallets, shortAddress, useWallet } from '@/services/wallet/wallet'
import { useHealth } from '@/hooks/useGateway'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

const INSTALL = [
  { name: 'Phantom', href: 'https://phantom.com/download' },
  { name: 'Solflare', href: 'https://solflare.com/download' },
  { name: 'Backpack', href: 'https://backpack.app/download' },
]

/** Connect / show / disconnect a Solana wallet. `variant="block"` for in-page use. */
export function WalletMenu({ variant = 'pill', align = 'right' }: { variant?: 'pill' | 'block'; align?: 'left' | 'right' }) {
  const { available, wallet, account, connecting, connectingWalletName, error: walletError } = useWallet()
  const health = useHealth()
  const [open, setOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    refreshWallets()
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const error = localError || walletError
  const network = health.data?.solana.network === 'mainnet-beta' ? 'Mainnet' : health.data ? 'Devnet' : null
  const label = account ? shortAddress(account.address) : connecting ? (connectingWalletName ? `Connecting to ${connectingWalletName}…` : 'Connecting…') : 'Connect wallet'

  return (
    <div ref={ref} className={cn('relative', variant === 'block' && 'w-full')}>
      <button
        type="button"
        onClick={() => {
          setLocalError(null)
          refreshWallets()
          setOpen((o) => !o)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-2 transition',
          variant === 'pill'
            ? 'h-8 rounded-full border border-white/10 px-3 text-xs text-steel-200 hover:border-white/20 hover:text-steel-50'
            : 'h-11 w-full justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-steel-100 hover:border-white/20',
        )}
      >
        <span className="inline-flex items-center gap-2">
          {connecting ? (
            <Loader2 className="size-3.5 animate-spin text-steel-400" />
          ) : wallet?.icon ? (
            <img src={wallet.icon} alt="" className="size-4 rounded" />
          ) : (
            <Wallet className="size-3.5" />
          )}
          <span className={cn(account && 'font-mono')}>{label}</span>
          {account && network && <span className="text-[10px] uppercase tracking-wider text-steel-500">{network}</span>}
        </span>
        <ChevronDown className="size-3.5 text-steel-500" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={cn(
              'surface-raised absolute z-50 mt-2 w-72 rounded-xl p-2 shadow-2xl',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {account && wallet ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-[11px] text-steel-500">Connected with {wallet.name}</p>
                  <p className="mt-1 break-all font-mono text-[12px] text-steel-100">{account.address}</p>
                </div>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    void disconnectWallet()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-steel-300 hover:bg-white/[0.05] hover:text-steel-50"
                >
                  <LogOut className="size-4" /> Disconnect
                </button>
              </>
            ) : available.length > 0 ? (
              <>
                <p className="px-3 py-2 text-[11px] text-steel-500">Choose a Solana wallet</p>
                {available.map((w) => {
                  const isThisConnecting = connecting && connectingWalletName === w.name
                  return (
                    <button
                      key={w.name}
                      role="menuitem"
                      type="button"
                      disabled={connecting}
                      onClick={async () => {
                        setLocalError(null)
                        try {
                          await connectWallet(w)
                          setOpen(false)
                        } catch (e) {
                          setLocalError(e instanceof Error ? e.message : 'The wallet refused the connection')
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13.5px] text-steel-100 hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <img src={w.icon} alt="" className="size-5 rounded" />
                        {w.name}
                      </span>
                      {isThisConnecting && <Loader2 className="size-4 animate-spin text-steel-400" />}
                    </button>
                  )
                })}
              </>
            ) : (
              <div className="px-3 py-2">
                <p className="text-[13px] text-steel-200">No Solana wallet found in this browser.</p>
                <p className="mt-1 text-[12px] text-steel-500">Install one, then reload this page.</p>
                <ul className="mt-3 space-y-1">
                  {INSTALL.map((w) => (
                    <li key={w.name}>
                      <a href={w.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[13px] text-steel-200 hover:text-white">
                        {w.name} <ArrowUpRight className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-1 border-t border-white/5 px-3 pb-2 pt-2 text-[12px] leading-relaxed text-bad">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
