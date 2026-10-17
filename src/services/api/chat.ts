import { backendMode } from '@/lib/env'
import type { ChatCompletionRequest, ChatCompletionResult } from '@/types/api'
import { request } from './client'
import { getGatewayKeys } from './gateway'
import { mockChat } from './mocks'
import { extractReceipt } from '../receipts'

/**
 * POST /v1/chat/completions — non-streaming.
 * Pays with the session's prepaid key or an on-chain x402 payment, and can
 * seal the request to the gateway's ML-KEM-768 key.
 */
export async function createChatCompletion(req: ChatCompletionRequest, signal?: AbortSignal): Promise<ChatCompletionResult> {
  if (backendMode === 'mock') return mockChat(req, signal)

  const plain = { ...req.extra, model: req.model, messages: req.messages }
  const headers: Record<string, string> = {}
  if (req.payment.kind === 'x402') {
    headers['PAYMENT-SIGNATURE'] = btoa(
      JSON.stringify({ x402Version: 2, signature: req.payment.signature, ...(req.payment.reference ? { reference: req.payment.reference } : {}) }),
    )
  }

  let body: unknown = plain
  let secret: Uint8Array | null = null
  if (req.seal) {
    const [{ sealRequest }, keys] = await Promise.all([import('../crypto/seal'), getGatewayKeys(signal)])
    const sealed = await sealRequest(plain, keys.mlKemPublicKey)
    body = sealed.payload
    secret = sealed.clientSecretKey
  }

  const res = await request<unknown>('/v1/chat/completions', {
    method: 'POST',
    body,
    signal,
    headers,
    auth: req.payment.kind === 'key',
  })

  let completion: unknown = res.data
  if (secret && res.data && typeof res.data === 'object' && (res.data as { sealed?: unknown }).sealed === true) {
    const { openSealedResponse } = await import('../crypto/seal')
    completion = await openSealedResponse(res.data as never, secret)
  }

  return {
    ...readCompletion(completion),
    status: res.status,
    headers: res.headers,
    raw: completion,
    receipt: extractReceipt(res.data),
    sealed: res.headers['x-qseal-sealed'] === 'true',
    latencyMs: res.latencyMs,
  }
}

export function readCompletion(data: unknown): Pick<ChatCompletionResult, 'text' | 'id' | 'model'> {
  if (!data || typeof data !== 'object') return { text: typeof data === 'string' ? data : null }
  const d = data as Record<string, unknown>
  const choices = Array.isArray(d.choices) ? d.choices : []
  const first = choices[0] as { message?: { content?: unknown } } | undefined
  const content = first?.message?.content
  return {
    text: typeof content === 'string' ? content : null,
    id: typeof d.id === 'string' ? d.id : undefined,
    model: typeof d.model === 'string' ? d.model : undefined,
  }
}
