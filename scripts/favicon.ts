/** Regenerates public/favicon.svg from the emblem geometry: `npx vite-node scripts/favicon.ts` */
import { writeFileSync } from 'node:fs'
import { buildEmblem, EMBLEM_BOUNDS as B } from '../src/lib/emblem'

const e = buildEmblem({ detail: 'mark' })
const fills = ['#3a3b40', '#9ea0a7', '#eef0f2']
const pad = 0.18
const w = B.maxX - B.minX + pad * 2
const h = B.maxY - B.minY + pad * 2
const size = Math.max(w, h)
const ox = B.minX - pad - (size - w) / 2
const oy = -B.maxY - pad - (size - h) / 2
const f = (n: number) => n.toFixed(3)

const rects = [
  ...e.bars.map((b) => `<rect x="${f(b.x - b.w / 2)}" y="${f(-(b.y + b.h / 2))}" width="${f(b.w)}" height="${f(b.h)}" fill="${fills[b.shade]}"/>`),
  ...e.cubes.map((c) => `<rect x="${f(c.x - c.s / 2)}" y="${f(-(c.y + c.s / 2))}" width="${f(c.s)}" height="${f(c.s)}" fill="${fills[c.shade]}"/>`),
  `<polygon points="${e.tail.outline.map(([x, y]) => `${f(x)},${f(-y)}`).join(' ')}" fill="#eef0f2"/>`,
]
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(ox)} ${f(oy)} ${f(size)} ${f(size)}"><rect x="${f(ox)}" y="${f(oy)}" width="${f(size)}" height="${f(size)}" rx="${f(size * 0.22)}" fill="#0b0b0d"/>${rects.join('')}</svg>\n`
writeFileSync(new URL('../public/favicon.svg', import.meta.url), svg)
console.log('favicon.svg written', svg.length, 'bytes')
