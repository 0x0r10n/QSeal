import { backendMode } from '@/lib/env'
import type { ModelInfo } from '@/types/api'
import { request } from './client'
import { ApiError } from './errors'
import { mockModels } from './mocks'

/** GET /v1/models — parsed defensively; unknown fields kept in `raw`. */
export async function listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
  if (backendMode === 'mock') return mockModels()
  const { data } = await request<unknown>('/v1/models', { signal, timeoutMs: 15_000, auth: false })
  return parseModels(data)
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

export function parseModels(data: unknown): ModelInfo[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : null
  if (!list) throw new ApiError('parse', 'Model list response did not contain an array of models.')
  return list.flatMap((item): ModelInfo[] => {
    if (typeof item === 'string') return [{ id: item, raw: item }]
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, read field by field
    const m = item as Record<string, any>
    return [
      {
        id: m.id,
        ownedBy: str(m.owned_by),
        created: num(m.created),
        description: str(m.description),
        family: str(m.family),
        vendor: str(m.vendor),
        priceUsdc: num(m.pricing?.price_per_request_usdc),
        contextWindow: num(m.capabilities?.context_window),
        servedBy: m.served_by ? { provider: str(m.served_by.provider), upstreamModel: str(m.served_by.upstream_model) } : undefined,
        raw: item,
      },
    ]
  })
}
