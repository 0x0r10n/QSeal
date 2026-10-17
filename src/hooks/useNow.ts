import { useEffect, useState } from 'react'

/** The current time, refreshed on each minute boundary (the user's own clock and time zone). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const tick = () => setNow(new Date())
    // Align to the next minute, then tick every minute.
    const first = setTimeout(() => {
      tick()
      interval = setInterval(tick, 60_000)
    }, 60_000 - (Date.now() % 60_000))
    // Catch up immediately after the tab was asleep or hidden.
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

export function greetingFor(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Working late'
}
