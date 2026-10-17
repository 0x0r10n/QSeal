import { useState, useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useWallet } from '@/services/wallet/wallet'
import { getAccessKey, subscribeAccessKey } from '@/services/api/credentials'
import { isMarketingDomain, getAppUrl } from '@/lib/domains'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { account, connecting } = useWallet()
  const [accessKey, setKey] = useState<string | null>(() => getAccessKey())
  const location = useLocation()

  useEffect(() => {
    // If user accessed /app from the marketing domain (qrouter.cloud), redirect to app.qrouter.cloud
    if (isMarketingDomain() && typeof window !== 'undefined') {
      window.location.href = getAppUrl(location.pathname + location.search)
    }
  }, [location])

  useEffect(() => {
    return subscribeAccessKey(() => {
      setKey(getAccessKey())
    })
  }, [])

  // Allow a moment if wallet is currently in the middle of reconnecting from storage
  if (connecting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  const isAuthenticated = Boolean(account || accessKey)

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return <>{children}</>
}
