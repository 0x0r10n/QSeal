/**
 * Geometry for the QRouter emblem: a ring of separated vertical chrome bars,
 * heavier on the left, that disintegrates into loose cubes across its upper
 * right, closed by a framed diagonal blade as the tail.
 *
 * The same data drives the flat SVG mark and the 3D sculpture.
 * Units: ring outer radius = 1, origin at the ring centre, y up.
 */
export type Shade = 0 | 1 | 2 // 0 = black chrome, 1 = mid steel, 2 = bright chrome

export interface Fragment {
  x: number
  y: number
  w: number
  h: number
  /** Depth offset, used by the 3D scene. */
  z: number
  d: number
  shade: Shade
}

export interface Cube {
  x: number
  y: number
  s: number
  z: number
  shade: Shade
  /** 0 → part of the ring, 1 → far adrift. Drives motion in 3D. */
  drift: number
}

export type Pt = [number, number]

export interface Emblem {
  bars: Fragment[]
  cubes: Cube[]
  tail: { outline: Pt[]; tiles: Array<{ pts: Pt[]; shade: Shade }> }
}

export interface EmblemOptions {
  /** 'full' for large renders; 'mark' is simplified for small UI sizes. */
  detail?: 'full' | 'mark'
  seed?: number
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const OUTER = 1

export const EMBLEM_BOUNDS = { minX: -1.02, maxX: 1.5, minY: -1.12, maxY: 1.12 }
// Inner hole is offset right, so the ring is thick on the left, thin on the right.
const INNER = { cx: 0.13, cy: 0.03, r: 0.6 }

/** Tail blade: horizontal top and bottom edges, running down to the lower right. */
const TAIL: Pt[] = [
  [0.02, -0.25],
  [0.27, -0.25],
  [1.16, -1.1],
  [0.92, -1.1],
]

function ringIntervals(x: number): Array<[number, number]> {
  if (Math.abs(x) >= OUTER) return []
  const yo = Math.sqrt(OUTER * OUTER - x * x)
  const dx = x - INNER.cx
  if (Math.abs(dx) >= INNER.r) return [[-yo, yo]]
  const yi = Math.sqrt(INNER.r * INNER.r - dx * dx)
  return [
    [-yo, INNER.cy - yi],
    [INNER.cy + yi, yo],
  ]
}

/** How strongly the ring has dissolved at angle θ (degrees). Peaks at the right. */
export function dissolveAt(theta: number) {
  const centre = 18
  const half = 62
  const t = Math.max(0, 1 - Math.abs(theta - centre) / half)
  return t * t * (3 - 2 * t)
}

/** Distance-aware test: is (x, y) inside the tail blade, grown by `margin`? */
function nearTail(x: number, y: number, margin: number) {
  const [tl, tr, br] = TAIL
  if (y > tl[1] + margin || y < br[1] - margin) return false
  const t = (tl[1] - y) / (tl[1] - br[1])
  const left = tl[0] + (TAIL[3][0] - tl[0]) * t
  const right = tr[0] + (br[0] - tr[0]) * t
  return x > left - margin && x < right + margin
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function buildTail(detail: 'full' | 'mark') {
  const [tl, tr, br, bl] = TAIL
  const tiles: Emblem['tail']['tiles'] = []
  const along = detail === 'full' ? 7 : 3
  const across = detail === 'full' ? 2 : 1
  const r = rng(91)
  const inset = 0.035
  // Inset the frame so tiles sit inside a visible border.
  const L: [Pt, Pt] = [lerp(tl, tr, inset / 0.25), lerp(bl, br, inset / 0.24)]
  const R: [Pt, Pt] = [lerp(tr, tl, inset / 0.25), lerp(br, bl, inset / 0.24)]
  L[0][1] -= inset
  R[0][1] -= inset
  L[1][1] += inset
  R[1][1] += inset
  for (let i = 0; i < along; i++) {
    const t0 = i / along + 0.006
    const t1 = (i + 1) / along - 0.006
    for (let j = 0; j < across; j++) {
      const s0 = j / across + (j ? 0.012 : 0)
      const s1 = (j + 1) / across - (j < across - 1 ? 0.012 : 0)
      const a0 = lerp(L[0], L[1], t0)
      const b0 = lerp(R[0], R[1], t0)
      const a1 = lerp(L[0], L[1], t1)
      const b1 = lerp(R[0], R[1], t1)
      tiles.push({
        pts: [lerp(a0, b0, s0), lerp(a0, b0, s1), lerp(a1, b1, s1), lerp(a1, b1, s0)],
        shade: (r() < 0.45 ? 2 : r() < 0.6 ? 1 : 0) as Shade,
      })
    }
  }
  return { outline: TAIL, tiles }
}

export function buildEmblem({ detail = 'full', seed = 7 }: EmblemOptions = {}): Emblem {
  const r = rng(seed)
  const columns = detail === 'full' ? 30 : 13
  const pitch = (2 * OUTER) / columns
  const bars: Fragment[] = []
  const cubes: Cube[] = []
  const pickShade = (): Shade => (r() < 0.45 ? 2 : r() < 0.6 ? 1 : 0) as Shade

  for (let c = 0; c < columns; c++) {
    const xc = -OUTER + pitch * (c + 0.5)
    for (const [lo, hi] of ringIntervals(xc)) {
      if (hi - lo < 0.03) continue
      // Split each interval into stacked fragments of uneven length.
      const pieces = detail === 'full' ? 1 + Math.floor(r() * 3) : 1
      const cuts = [lo, ...Array.from({ length: pieces - 1 }, () => lo + r() * (hi - lo)).sort((a, b) => a - b), hi]
      for (let k = 0; k < cuts.length - 1; k++) {
        const gap = detail === 'full' ? 0.012 : 0
        const a = cuts[k] + (k ? gap : 0)
        const b = cuts[k + 1] - (k < cuts.length - 2 ? gap : 0)
        if (b - a < 0.025) continue
        const y = (a + b) / 2
        const w = pitch * (detail === 'full' ? 0.55 + r() * 0.4 : 0.62)
        const x = xc + (detail === 'full' ? (r() - 0.5) * pitch * 0.25 : 0)
        const theta = (Math.atan2(y, x) * 180) / Math.PI
        const dis = dissolveAt(theta)

        if (detail === 'full' && r() < dis * 0.95) {
          // This fragment has broken apart into cubes drifting outward.
          const n = 1 + Math.floor(r() * 3)
          for (let q = 0; q < n; q++) {
            const along = a + r() * (b - a)
            const push = dis * (0.05 + r() * 0.35)
            const ang = Math.atan2(along, x)
            cubes.push({
              x: x + Math.cos(ang) * push + push * 0.4,
              y: along + Math.sin(ang) * push * 0.6,
              s: 0.025 + r() * 0.06 * (1 - push),
              z: (r() - 0.5) * 0.3,
              shade: pickShade(),
              drift: Math.min(1, push * 2.4),
            })
          }
          continue
        }
        if (detail === 'mark' && dis > 0.75) continue
        if (nearTail(x, y, w / 2 + 0.03) || nearTail(x, a, w / 2 + 0.03) || nearTail(x, b, w / 2 + 0.03)) continue
        bars.push({ x, y, w, h: b - a, z: detail === 'full' ? (r() - 0.5) * 0.18 : 0, d: 0.1 + r() * 0.14, shade: pickShade() })
      }
    }
  }

  // Loose cubes adrift beyond the ring's upper right.
  const adrift = detail === 'full' ? 46 : 5
  for (let i = 0; i < adrift; i++) {
    const theta = ((-35 + r() * 115) * Math.PI) / 180
    const dist = OUTER + (detail === 'full' ? r() ** 1.6 * 0.42 : 0.04 + r() * 0.08)
    const far = (dist - OUTER) / 0.42
    cubes.push({
      x: Math.cos(theta) * dist + 0.04,
      y: Math.sin(theta) * dist,
      s: (detail === 'full' ? 0.022 : 0.05) + r() * 0.05 * (1 - far * 0.7),
      z: (r() - 0.5) * 0.4,
      shade: pickShade(),
      drift: Math.min(1, 0.4 + far),
    })
  }

  const B = EMBLEM_BOUNDS
  const inside = cubes.filter(
    (c) => !nearTail(c.x, c.y, c.s / 2 + 0.02) && c.x + c.s / 2 <= B.maxX && c.y + c.s / 2 <= B.maxY && c.y - c.s / 2 >= B.minY,
  )
  return { bars, cubes: inside, tail: buildTail(detail) }
}
