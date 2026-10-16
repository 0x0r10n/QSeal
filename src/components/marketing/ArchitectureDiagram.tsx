import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useMediaQuery'

/**
 * High-level architecture. Nodes are the components this frontend knows
 * exist; arrows are logical data flow, not a network topology.
 */
const NODES = [
  { id: 'client', x: 40, y: 150, w: 170, label: 'Client / Agent', sub: 'App, SDK, autonomous agent' },
  { id: 'api', x: 300, y: 150, w: 170, label: 'QSeal API', sub: '/v1 · OpenAI-compatible' },
  { id: 'infer', x: 560, y: 70, w: 170, label: 'Inference', sub: 'Selected model' },
  { id: 'receipt', x: 560, y: 230, w: 170, label: 'Receipt signer', sub: 'Signed record' },
  { id: 'verify', x: 820, y: 230, w: 150, label: 'Verifier', sub: 'Anyone, offline' },
  { id: 'pay', x: 300, y: 330, w: 170, label: 'Solana', sub: 'Wallet auth · payments' },
]

const EDGES: Array<[string, string, string?]> = [
  ['client', 'api'],
  ['api', 'infer'],
  ['api', 'receipt'],
  ['receipt', 'verify'],
  ['api', 'pay', 'dashed'],
]

const H = 64
function anchor(id: string) {
  const n = NODES.find((n) => n.id === id)!
  return { l: [n.x, n.y + H / 2], r: [n.x + n.w, n.y + H / 2], b: [n.x + n.w / 2, n.y + H], t: [n.x + n.w / 2, n.y] }
}

function path(a: string, b: string) {
  const A = anchor(a)
  const B = anchor(b)
  if (b === 'pay') return `M${A.b[0]},${A.b[1]} L${B.t[0]},${B.t[1]}`
  const [x1, y1] = A.r
  const [x2, y2] = B.l
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}

export function ArchitectureDiagram() {
  const reduced = useReducedMotion()
  return (
    <figure className="surface overflow-hidden rounded-3xl p-4 sm:p-8">
      <div className="scrollbar-thin overflow-x-auto">
        <svg viewBox="0 0 1010 420" className="min-w-[720px]" role="img" aria-labelledby="arch-title arch-desc">
          <title id="arch-title">QSeal architecture</title>
          <desc id="arch-desc">
            A client sends requests to the QSeal API, which runs inference on the selected model and issues a signed receipt that a
            verifier can check. Solana handles wallet authentication and payments separately.
          </desc>
          <defs>
            <linearGradient id="edge" x1="0" x2="1">
              <stop offset="0" stopColor="#6f717a" />
              <stop offset="1" stopColor="#e6e7ea" />
            </linearGradient>
          </defs>
          {EDGES.map(([a, b, style], i) => {
            const d = path(a, b)
            return (
              <g key={`${a}-${b}`}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke="url(#edge)"
                  strokeWidth={1.2}
                  strokeDasharray={style === 'dashed' ? '4 6' : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                />
                {!reduced && style !== 'dashed' && (
                  <circle r="2.5" fill="#f4f4f6">
                    <animateMotion dur={`${3 + i * 0.4}s`} repeatCount="indefinite" path={d} begin={`${i * 0.5}s`} />
                  </circle>
                )}
              </g>
            )
          })}
          {NODES.map((n, i) => (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <rect x={n.x} y={n.y} width={n.w} height={H} rx={14} fill="#121215" stroke="rgba(255,255,255,0.14)" />
              <text x={n.x + 18} y={n.y + 28} fill="#f4f4f6" fontSize="14" fontWeight="500" fontFamily="Inter Variable, sans-serif">
                {n.label}
              </text>
              <text x={n.x + 18} y={n.y + 47} fill="#6f717a" fontSize="11" fontFamily="JetBrains Mono Variable, monospace">
                {n.sub}
              </text>
            </motion.g>
          ))}
          <text x="485" y="315" fill="#55575f" fontSize="10.5" fontFamily="JetBrains Mono Variable, monospace">
            classical signatures (Ed25519)
          </text>
        </svg>
      </div>
      <figcaption className="mt-4 font-mono text-[11px] text-steel-600">
        Logical data flow. Dashed line: identity and payment rail, separate from inference cryptography.
      </figcaption>
    </figure>
  )
}
