import { useQuery } from '@tanstack/react-query'
import { getTrialStatus, type TrialStatus } from '@/services/api/trials'

export function useTrialStatus(walletAddress?: string) {
  return useQuery<TrialStatus>({
    queryKey: ['trial-status', walletAddress],
    queryFn: () => getTrialStatus(walletAddress),
    enabled: Boolean(walletAddress),
    staleTime: 5_000,
  })
}
