import { useQuery } from '@tanstack/react-query'
import { backendMode } from '@/lib/env'
import { listModels } from '@/services/api/models'

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: ({ signal }) => listModels(signal),
    enabled: backendMode !== 'unconfigured',
    staleTime: 60_000,
    retry: 1,
  })
}

export type BackendStatus = 'unconfigured' | 'checking' | 'online' | 'unreachable' | 'sample'

/** Derived from the model catalogue call — the only read endpoint known to exist. */
export function useBackendStatus(): { status: BackendStatus; error: unknown; refetch: () => void } {
  const q = useModels()
  const refetch = () => void q.refetch()
  if (backendMode === 'unconfigured') return { status: 'unconfigured', error: null, refetch }
  if (backendMode === 'mock') return { status: 'sample', error: null, refetch }
  if (q.isPending) return { status: 'checking', error: null, refetch }
  if (q.isError) return { status: 'unreachable', error: q.error, refetch }
  return { status: 'online', error: null, refetch }
}
