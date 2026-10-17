import { useQuery } from '@tanstack/react-query'
import { backendMode } from '@/lib/env'
import { getHealth, getKeyBalance } from '@/services/api/gateway'
import { useAccessKey } from './useAccessKey'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    enabled: backendMode === 'live',
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/** Balance of the prepaid key in this session, if any. */
export function useKeyBalance() {
  const key = useAccessKey()
  return useQuery({
    queryKey: ['balance', key],
    queryFn: ({ signal }) => getKeyBalance(undefined, signal),
    enabled: backendMode === 'live' && Boolean(key),
    staleTime: 10_000,
    retry: false,
  })
}
