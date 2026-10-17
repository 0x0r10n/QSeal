import { Link } from 'react-router-dom'
import { PlugZap, FlaskConical } from 'lucide-react'
import { backendMode, env } from '@/lib/env'
import { useHealth } from '@/hooks/useGateway'

/** Persistent note whenever the app is not talking to a production backend. */
export function ConfigBanner() {
  const health = useHealth()
  if (backendMode === 'live') {
    if (health.data?.mode !== 'development') return null
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warn/15 bg-warn/[0.05] px-4 py-2.5 text-[13px] text-warn sm:px-6">
        <FlaskConical className="size-4 shrink-0" />
        <span>
          Development gateway: free test keys and simulated payments are enabled
          {health.data.upstream.active ? '.' : ', and with no model provider set, responses come from a labelled echo engine.'}
        </span>
      </div>
    )
  }
  if (backendMode === 'mock') {
    return (
      <div className="flex items-center gap-3 border-b border-warn/15 bg-warn/[0.05] px-4 py-2.5 text-[13px] text-warn sm:px-6">
        <FlaskConical className="size-4 shrink-0" />
        <span>Development sample data. No backend is connected. Nothing shown here is real.</span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[13px] text-steel-400 sm:px-6">
      <PlugZap className="size-4 shrink-0 text-steel-300" />
      <span>
        {env.apiUrlInvalid ? 'VITE_QROUTER_API_URL is not a valid URL.' : 'No backend connected.'} Set{' '}
        <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-steel-200">VITE_QROUTER_API_URL</code> to enable
        live data.
      </span>
      <Link to="/app/settings#backend" className="ml-auto text-steel-200 underline decoration-white/20 underline-offset-4 hover:decoration-white">
        Details
      </Link>
    </div>
  )
}
