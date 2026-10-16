import { useSyncExternalStore } from 'react'
import { usePrefs } from './usePrefs'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (fn) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', fn)
      return () => m.removeEventListener('change', fn)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Honours the OS setting and the in-app override from Settings. */
export function useReducedMotion(): boolean {
  const sys = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { motion } = usePrefs()
  return motion === 'reduced' || (motion === 'system' && sys)
}
