import { backendMode } from '@/lib/env'
import type { GatewayKeys, Health, KeyBalance, PreparedPayment } from '@/types/api'
import { request } from './client'
import { ApiError } from './errors'

const requireLive = () => {
  if (backendMode !== 'live') throw new ApiError('unconfigured', 'No backend URL configured.')
}

/** GET /health — network, pricing, provider and mode. */
export async function getHealth(signal?: AbortSignal): Promise<Health> {
  requireLive()
  return (await request<Health>('/health', { signal, timeoutMs: 10_000, auth: false })).data
}

let keysCache: { at: number; keys: Promise<GatewayKeys> } | null = null
const KEYS_TTL_MS = 10 * 60_000

/** GET /.well-known/qrouter-keys.json (or /.well-known/qseal-keys.json) — the published receipt verification keys (cached for 10 minutes). */
export function getGatewayKeys(signal?: AbortSignal): Promise<GatewayKeys> {
  requireLive()
  if (keysCache && Date.now() - keysCache.at < KEYS_TTL_MS) return keysCache.keys
  const keys = request<GatewayKeys>('/.well-known/qrouter-keys.json', { signal, timeoutMs: 15_000, auth: false })
    .catch(() => request<GatewayKeys>('/.well-known/qseal-keys.json', { signal, timeoutMs: 15_000, auth: false }))
    .then((r) => r.data)
  keysCache = { at: Date.now(), keys }
  keys.catch(() => {
    keysCache = null
  })
  return keys
}

/** GET /v1/keys/balance with the given (or session) key. */
export async function getKeyBalance(key?: string, signal?: AbortSignal): Promise<KeyBalance> {
  requireLive()
  return (
    await request<KeyBalance>('/v1/keys/balance', {
      signal,
      timeoutMs: 15_000,
      ...(key ? { auth: false, headers: { Authorization: `Bearer ${key}` } } : {}),
    })
  ).data
}

/** POST /v1/keys/prepaid — exchange a confirmed USDC deposit for a new key. */
export async function buyPrepaidKey(paymentSignature: string, reference?: string) {
  requireLive()
  const { data } = await request<KeyBalance & { api_key: string }>('/v1/keys/prepaid', {
    method: 'POST',
    auth: false,
    body: { payment_signature: paymentSignature, ...(reference ? { reference } : {}) },
    timeoutMs: 60_000,
  })
  return data
}

/** POST /v1/keys/topup — add a confirmed deposit to the session key. */
export async function topUpKey(paymentSignature: string, reference?: string) {
  requireLive()
  const { data } = await request<KeyBalance & { credited_usdc: number }>('/v1/keys/topup', {
    method: 'POST',
    body: { payment_signature: paymentSignature, ...(reference ? { reference } : {}) },
    timeoutMs: 60_000,
  })
  return data
}

/** POST /v1/payments/prepare — the gateway builds an unsigned USDC transfer for the wallet to sign. */
export async function preparePayment(
  payer: string,
  purpose: { kind: 'request'; model: string } | { kind: 'deposit'; amountUsdc: number },
): Promise<PreparedPayment> {
  requireLive()
  const body =
    purpose.kind === 'request'
      ? { payer, purpose: 'request', model: purpose.model }
      : { payer, purpose: 'deposit', amount_usdc: purpose.amountUsdc }
  return (await request<PreparedPayment>('/v1/payments/prepare', { method: 'POST', body, auth: false, timeoutMs: 20_000 })).data
}

/** POST /v1/receipts/verify — the gateway's own check. */
export async function verifyOnGateway(input: { receipt: unknown } | { receipt_id: string }) {
  requireLive()
  return (
    await request<{
      receipt_id: string
      verification: { valid: boolean; mlDsaValid: boolean; ed25519Valid: boolean; signerMatchesGateway: boolean; reason: string }
    }>('/v1/receipts/verify', { method: 'POST', body: input, auth: false, timeoutMs: 20_000 })
  ).data
}

/** GET /v1/receipts/:id */
export async function fetchReceipt(id: string) {
  requireLive()
  return (await request<{ receipt: unknown }>(`/v1/receipts/${encodeURIComponent(id)}`, { auth: false, timeoutMs: 20_000 })).data.receipt
}

/** Development gateways only: a free key for testing the full flow. */
export async function createDevKey(amountUsdc = 5) {
  requireLive()
  const { data } = await request<KeyBalance & { api_key: string }>('/v1/keys/prepaid', {
    method: 'POST',
    auth: false,
    body: { dev: true, amount_usdc: amountUsdc },
  })
  return data
}

/** GET /v1/receipts/stats — how many receipts this gateway has signed. */
export async function getReceiptStats(signal?: AbortSignal): Promise<{ totalReceiptsIssued: number }> {
  requireLive()
  return (await request<{ totalReceiptsIssued: number }>('/v1/receipts/stats', { signal, timeoutMs: 10_000, auth: false })).data
}
