export type ApiErrorKind =
  | 'unconfigured'
  | 'network' // DNS, CORS, offline — the browser hides which
  | 'timeout'
  | 'aborted'
  | 'http'
  | 'payment' // HTTP 402: the gateway wants payment (body carries the x402 challenge)
  | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly body?: unknown

  constructor(kind: ApiErrorKind, message: string, opts: { status?: number; body?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = opts.status
    this.body = opts.body
  }
}

export function describeError(err: unknown): { title: string; detail: string } {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'unconfigured':
        return { title: 'Backend not configured', detail: 'Set VITE_QROUTER_API_URL to connect this frontend to a QRouter backend.' }
      case 'network':
        return {
          title: 'Backend unreachable',
          detail: 'The request did not reach the server. Check the URL, your connection, and that the backend allows this origin (CORS).',
        }
      case 'timeout':
        return { title: 'Request timed out', detail: err.message }
      case 'aborted':
        return { title: 'Request cancelled', detail: 'The request was cancelled before it completed.' }
      case 'http':
        return { title: err.status && err.status >= 500 ? 'The gateway could not complete this' : `Request refused (${err.status})`, detail: err.message }
      case 'payment':
        return { title: 'Payment required', detail: err.message }
      case 'parse':
        return { title: 'Unexpected response', detail: err.message }
    }
  }
  return { title: 'Something went wrong', detail: err instanceof Error ? err.message : String(err) }
}
