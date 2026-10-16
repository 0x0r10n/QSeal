import { backendMode } from '@/lib/env'
import type { ChatCompletionRequest, ChatCompletionResult } from '@/types/api'
import { request } from './client'
import { mockChat } from './mocks'

/**
 * POST /v1/chat/completions — non-streaming.
 * Only `model` and `messages` are sent unless the user adds extra fields.
 */
export async function createChatCompletion(
  req: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResult> {
  if (backendMode === 'mock') return mockChat(req, signal)
  const body = { ...req.extra, model: req.model, messages: req.messages }
  const res = await request<unknown>('/v1/chat/completions', { method: 'POST', body, signal })
  return { ...readCompletion(res.data), status: res.status, headers: res.headers, raw: res.data, latencyMs: res.latencyMs }
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
