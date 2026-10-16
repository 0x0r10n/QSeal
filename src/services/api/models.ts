import { backendMode } from '@/lib/env'
import type { ModelInfo } from '@/types/api'
import { request } from './client'
import { ApiError } from './errors'
import { mockModels } from './mocks'

/** GET /v1/models — parsed defensively; unknown fields kept in `raw`. */
export async function listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
  if (backendMode === 'mock') return mockModels()
  const { data } = await request<unknown>('/v1/models', { signal, timeoutMs: 15_000 })
  return parseModels(data)
}

export function parseModels(data: unknown): ModelInfo[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : null
  if (!list) throw new ApiError('parse', 'Model list response did not contain an array of models.')
  return list.flatMap((item): ModelInfo[] => {
    if (typeof item === 'string') return [{ id: item, raw: item }]
    if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
      const m = item as { id: string; owned_by?: unknown; created?: unknown }
      return [{
        id: m.id,
        ownedBy: typeof m.owned_by === 'string' ? m.owned_by : undefined,
        created: typeof m.created === 'number' ? m.created : undefined,
        raw: item,
      }]
    }
    return []
  })
}
