import { describe, expect, it } from 'vitest'
import { MODEL_CATALOGUE } from './models'
import { CATALOGUE } from '../../backend/src/catalogue'

describe('marketing model list', () => {
  it('matches the gateway catalogue exactly', () => {
    const pick = (m: { id: string; family: string; vendor: string; description: string; contextWindow: number }) => ({
      id: m.id,
      family: m.family,
      vendor: m.vendor,
      description: m.description,
      contextWindow: m.contextWindow,
    })
    expect(MODEL_CATALOGUE.map(pick)).toEqual(CATALOGUE.map(pick))
  })
})
