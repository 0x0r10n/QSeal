import { env } from '@/lib/env'
import { authHeaders } from './credentials'
import { ApiError } from './errors'

export interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

export interface ApiResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
  latencyMs: number
}

/**
 * The single place that talks to the network. Every service goes through
 * here so timeouts, auth and error mapping behave identically everywhere.
 */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  if (!env.apiUrl) throw new ApiError('unconfigured', 'No backend URL configured.')

  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? env.timeoutMs
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onAbort = () => controller.abort()
  opts.signal?.addEventListener('abort', onAbort, { once: true })

  const started = performance.now()
  let res: Response
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    if (timedOut) throw new ApiError('timeout', `No response within ${Math.round(timeoutMs / 1000)} s.`)
    if (opts.signal?.aborted) throw new ApiError('aborted', 'Request cancelled.')
    throw new ApiError('network', e instanceof Error ? e.message : 'Network error')
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onAbort)
  }

  const latencyMs = performance.now() - started
  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => (headers[k] = v))

  const text = await res.text()
  let data: unknown = text
  if (text && (res.headers.get('content-type') ?? '').includes('json')) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError('parse', 'The server sent malformed JSON.', { status: res.status, body: text })
    }
  }

  if (!res.ok) {
    const msg = extractMessage(data) ?? (res.statusText || 'Request failed')
    throw new ApiError('http', msg, { status: res.status, body: data })
  }
  return { data: data as T, status: res.status, headers, latencyMs }
}

function extractMessage(body: unknown): string | null {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    const err = b.error
    if (typeof err === 'string') return err
    if (err && typeof err === 'object' && typeof (err as Record<string, unknown>).message === 'string') {
      return (err as Record<string, string>).message
    }
    if (typeof b.message === 'string') return b.message
    if (typeof b.detail === 'string') return b.detail
  }
  if (typeof body === 'string' && body.length > 0 && body.length < 300) return body
  return null
}
