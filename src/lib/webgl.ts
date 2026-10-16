let cached: boolean | null = null
export function hasWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const c = document.createElement('canvas')
    cached = Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    cached = false
  }
  return cached
}
