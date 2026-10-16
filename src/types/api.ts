/**
 * Types for the backend contracts that are known to exist.
 *
 * GET /v1/models and POST /v1/chat/completions follow the widely used
 * OpenAI-compatible shapes. Only the fields this UI reads are typed; every
 * other field is preserved untouched in `raw` so nothing is lost or invented.
 */
export interface ModelInfo {
  id: string
  ownedBy?: string
  created?: number
  raw: unknown
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  /** Free-form extra fields supplied by the user in Advanced settings. */
  extra?: Record<string, unknown>
}

export interface ChatCompletionResult {
  /** Assistant text if the response matched the expected shape. */
  text: string | null
  id?: string
  model?: string
  status: number
  headers: Record<string, string>
  raw: unknown
  latencyMs: number
}
