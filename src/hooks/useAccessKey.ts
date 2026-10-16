import { useSyncExternalStore } from 'react'
import { getAccessKey, subscribeAccessKey } from '@/services/api/credentials'

export function useAccessKey(): string | null {
  return useSyncExternalStore(subscribeAccessKey, getAccessKey, () => null)
}
