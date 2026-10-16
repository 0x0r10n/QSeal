import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, KeyRound, Wallet } from 'lucide-react'
import { QEmblem } from '@/components/brand/QEmblem'
import { Button } from '@/components/ui/Button'
import { StatusTag } from '@/components/ui/StatusTag'
import { setAccessKey } from '@/services/api/credentials'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { EASE } from '@/lib/motion'

export default function SignIn() {
  useDocumentTitle('Sign In')
  const navigate = useNavigate()
  const [key, setKey] = useState('')

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
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-steel-50">Sign in to QSeal</h1>
        <p className="mt-2 text-[15px] text-steel-400">Connect a wallet, or continue with a prepaid key.</p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            disabled
            aria-describedby="wallet-note"
            className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left opacity-70"
          >
            <Wallet className="size-5 text-steel-300" strokeWidth={1.5} />
            <span className="flex-1">
              <span className="block font-medium text-steel-100">Solana wallet</span>
              <span id="wallet-note" className="block text-[13px] text-steel-500">
                Enabled once wallet configuration is supplied
              </span>
            </span>
            <StatusTag tone="muted">Pending</StatusTag>
          </button>
        </div>

        <div className="my-7 flex items-center gap-4 text-xs text-steel-600">
          <span className="h-px flex-1 bg-white/[0.07]" /> or <span className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (key.trim()) setAccessKey(key.trim())
            navigate('/app')
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
            placeholder="Paste your key"
            className="mt-2.5 h-12 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 font-mono text-sm text-steel-50 placeholder:text-steel-600 focus:border-white/30 focus:outline-none"
          />
          <p className="mt-2 text-xs leading-relaxed text-steel-600">
            Kept in this tab’s session storage only and sent as a Bearer token to the configured backend.
          </p>
          <Button type="submit" size="lg" className="mt-6 w-full">
            {key.trim() ? 'Continue' : 'Continue without a key'} <ArrowRight className="size-4" />
          </Button>
        </form>
      </motion.div>
    </section>
  )
}
