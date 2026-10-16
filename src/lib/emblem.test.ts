import { describe, expect, it } from 'vitest'
import { buildEmblem, EMBLEM_BOUNDS } from './emblem'

describe('buildEmblem', () => {
  const full = buildEmblem()
  const mark = buildEmblem({ detail: 'mark' })

  it('builds a ring of bars, loose cubes, and a tiled tail', () => {
    expect(full.bars.length).toBeGreaterThan(60)
    expect(full.cubes.length).toBeGreaterThan(30)
    expect(full.tail.outline).toHaveLength(4)
    expect(full.tail.tiles.length).toBeGreaterThan(6)
  })

  it('is heavier on the left: the right side dissolves into cubes', () => {
    const left = full.bars.filter((b) => b.x < -0.3).length
    const right = full.bars.filter((b) => b.x > 0.3 && b.y > 0).length
    expect(left).toBeGreaterThan(right)
    expect(full.cubes.filter((c) => c.x > 0.3).length).toBeGreaterThan(full.cubes.length * 0.8)
  })

  it('is deterministic', () => {
    expect(buildEmblem()).toEqual(full)
  })

  it('keeps everything inside the declared bounds', () => {
    for (const e of [full, mark]) {
      for (const b of e.bars) {
        expect(b.x - b.w / 2).toBeGreaterThanOrEqual(EMBLEM_BOUNDS.minX)
        expect(b.y + b.h / 2).toBeLessThanOrEqual(EMBLEM_BOUNDS.maxY)
      }
      for (const c of e.cubes) {
        expect(c.x + c.s / 2).toBeLessThanOrEqual(EMBLEM_BOUNDS.maxX)
        expect(Math.abs(c.y) + c.s / 2).toBeLessThanOrEqual(EMBLEM_BOUNDS.maxY)
      }
    }
  })

  it('simplifies the small mark', () => {
    expect(mark.bars.length).toBeLessThan(full.bars.length)
    expect(mark.cubes.length).toBeLessThan(full.cubes.length)
  })
})
