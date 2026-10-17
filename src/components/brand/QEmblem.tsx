import { useId, useMemo } from 'react'
import { buildEmblem, EMBLEM_BOUNDS, type Pt, type Shade } from '@/lib/emblem'
import { cn } from '@/lib/cn'

interface Props {
  className?: string
  /** 'full' for large renders, 'mark' for small UI sizes. */
  detail?: 'full' | 'mark'
  title?: string
}

const PAD = 0.04
const { minX, maxX, minY, maxY } = EMBLEM_BOUNDS
const VB = `${minX - PAD} ${-maxY - PAD} ${maxX - minX + PAD * 2} ${maxY - minY + PAD * 2}`

// Cylindrical chrome ramps for each shade: black chrome, steel, bright chrome.
const RAMPS: Record<Shade, string[]> = {
  0: ['#050506', '#55575e', '#16161a', '#020203'],
  1: ['#26272b', '#d2d4d9', '#73757c', '#202124'],
  2: ['#5d5f66', '#ffffff', '#b8bac0', '#3f4045'],
}
const STOPS = [0, 0.3, 0.58, 1]

const poly = (pts: Pt[]) => pts.map(([x, y]) => `${x},${-y}`).join(' ')

/** The fragmented metallic Q, as a resolution-independent SVG. */
export function QEmblem({ className, detail = 'full', title }: Props) {
  const id = useId().replace(/:/g, '')
  const e = useMemo(() => buildEmblem({ detail }), [detail])
  const g = (s: Shade, kind: 'bar' | 'tile') => `url(#${id}-${kind}${s})`

  return (
    <svg
      viewBox={VB}
      className={cn('block', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        {([0, 1, 2] as Shade[]).map((s) => (
          <g key={s}>
            <linearGradient id={`${id}-bar${s}`} x1="0" x2="1" y1="0" y2="0">
              {RAMPS[s].map((c, i) => (
                <stop key={i} offset={STOPS[i]} stopColor={c} />
              ))}
            </linearGradient>
            <linearGradient id={`${id}-tile${s}`} x1="0" x2="1" y1="0" y2="1">
              {RAMPS[s].map((c, i) => (
                <stop key={i} offset={STOPS[i]} stopColor={c} />
              ))}
            </linearGradient>
          </g>
        ))}
        <linearGradient id={`${id}-frame`} gradientUnits="userSpaceOnUse" x1="0" y1="0.25" x2="1.16" y2="1.1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#7d7f86" />
          <stop offset="0.7" stopColor="#f2f3f5" />
          <stop offset="1" stopColor="#5a5c62" />
        </linearGradient>
      </defs>

      <g stroke="#ffffff" strokeOpacity={0.09} strokeWidth={0.004}>
        {e.bars.map((b, i) => (
          <rect key={i} x={b.x - b.w / 2} y={-(b.y + b.h / 2)} width={b.w} height={b.h} rx={0.006} fill={g(b.shade, 'bar')} />
        ))}
        {e.cubes.map((c, i) => (
          <rect key={`c${i}`} x={c.x - c.s / 2} y={-(c.y + c.s / 2)} width={c.s} height={c.s} rx={0.004} fill={g(c.shade, 'tile')} />
        ))}
      </g>

      <g>
        <polygon points={poly(e.tail.outline)} fill="#0b0b0d" stroke={`url(#${id}-frame)`} strokeWidth={0.024} strokeLinejoin="miter" />
        {e.tail.tiles.map((t, i) => (
          <polygon key={i} points={poly(t.pts)} fill={g(t.shade, 'tile')} />
        ))}
      </g>
    </svg>
  )
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <QEmblem className="h-[26px] w-auto" detail="mark" />
      {!compact && <span className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-steel-50">QSeal</span>}
    </span>
  )
}
