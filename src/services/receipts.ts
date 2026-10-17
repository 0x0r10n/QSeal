/**
 * Receipt extraction and verification.
 *
 * "Valid" is only ever reported after the ML-DSA-65 and Ed25519 signatures
 * have been checked in this browser against the keys the gateway publishes
 * at /.well-known/qrouter-keys.json. The gateway's own verdict is shown
 * alongside as a second opinion, never instead of the local check.
 */
import { backendMode } from '@/lib/env'
import type { QSealReceipt } from '@/types/api'
import { fetchReceipt, getGatewayKeys, verifyOnGateway } from './api/gateway'
import { describeError } from './api/errors'

export type VerificationOutcome =
  | { status: 'valid'; summary: string; details: Array<[string, string]>; receipt: QSealReceipt }
  | { status: 'invalid'; summary: string; reason: string; details: Array<[string, string]>; receipt?: QSealReceipt }
  | { status: 'unable'; summary: string; reason: string }
  | { status: 'unsupported'; summary: string; reason: string }

export const verificationConfigured = () => backendMode === 'live'

const RECEIPT_ID = /^rcpt_[a-f0-9]{32}$/

function short(hex: string) {
  return hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-8)}` : hex
}

export async function verifyReceipt(text: string): Promise<VerificationOutcome> {
  const trimmed = text.trim()
  if (!trimmed) return { status: 'unsupported', summary: 'Nothing to verify', reason: 'Paste a receipt or a receipt ID first.' }

  const { isReceiptShape, verifyLocally } = await import('./crypto/verifyReceipt')

  // Accept either a full receipt JSON or a receipt ID the gateway stores.
  let candidate: unknown
  if (RECEIPT_ID.test(trimmed)) {
    if (!verificationConfigured()) return { status: 'unable', summary: 'Unable to verify', reason: 'Looking up a receipt ID needs a connected gateway.' }
    try {
      candidate = await fetchReceipt(trimmed)
    } catch (e) {
      const { title, detail } = describeError(e)
      return { status: 'unable', summary: 'Unable to verify', reason: `${title}. ${detail}` }
    }
  } else {
    try {
      candidate = JSON.parse(trimmed)
    } catch {
      return { status: 'unsupported', summary: 'Unsupported format', reason: 'Expected a receipt as JSON, or a receipt ID (rcpt_…).' }
    }
    // Accept a whole completion response too.
    if (candidate && typeof candidate === 'object') {
      if ('qrouter_receipt' in candidate) {
        candidate = (candidate as { qrouter_receipt: unknown }).qrouter_receipt
      } else if ('qseal_receipt' in candidate) {
        candidate = (candidate as { qseal_receipt: unknown }).qseal_receipt
      } else if ('receipt' in candidate) {
        candidate = (candidate as { receipt: unknown }).receipt
      }
    }
  }

  if (!isReceiptShape(candidate)) {
    return { status: 'unsupported', summary: 'Unsupported format', reason: 'This JSON is not a QRouter receipt (missing id, version, payment or pqc signatures).' }
  }
  const receipt = candidate

  if (!verificationConfigured()) {
    return { status: 'unable', summary: 'Unable to verify', reason: 'Verification needs the gateway’s published keys, and no gateway is connected.' }
  }

  let keys
  try {
    keys = await getGatewayKeys()
  } catch (e) {
    const { title, detail } = describeError(e)
    return { status: 'unable', summary: 'Unable to verify', reason: `Could not fetch the gateway’s published keys. ${title}. ${detail}` }
  }

  const local = verifyLocally(receipt, keys)
  let gatewayVerdict = 'Not available'
  try {
    const g = await verifyOnGateway({ receipt })
    gatewayVerdict = g.verification.valid ? 'Valid' : `Invalid: ${g.verification.reason}`
  } catch {
    /* the local check is authoritative; the gateway check is a second opinion */
  }

  const details: Array<[string, string]> = [
    ['Receipt', receipt.id],
    ['Issued', new Date(receipt.timestamp).toLocaleString()],
    ['Model', receipt.model],
    ['Tokens', String(receipt.tokens.totalTokens)],
    ['Payment', `${receipt.payment.type} · ${receipt.payment.amountUsdc} USDC`],
    ['Sealed prompt', receipt.sealed ? 'Yes' : 'No'],
    ['ML-DSA-65 (FIPS 204)', local.mlDsaValid ? 'Signature valid' : 'Signature invalid'],
    ['Ed25519', local.ed25519Valid ? 'Signature valid' : 'Signature invalid'],
    ['Signing key', local.signerMatchesGateway ? `Gateway key ${short(keys.mlDsaPublicKey)}` : 'Not the gateway’s published key'],
    ['Gateway check', gatewayVerdict],
  ]

  if (local.valid) {
    return { status: 'valid', summary: 'Valid', details, receipt }
  }
  return {
    status: 'invalid',
    summary: 'Invalid',
    reason: !local.signerMatchesGateway
      ? 'This receipt was not signed with the connected gateway’s published keys.'
      : 'The signatures do not match the receipt’s contents. It was altered or is not genuine.',
    details,
    receipt,
  }
}

/** Pull the receipt out of a completion response. */
export function extractReceipt(raw: unknown): QSealReceipt | null {
  if (raw && typeof raw === 'object') {
    const r =
      ('qrouter_receipt' in raw && (raw as { qrouter_receipt: unknown }).qrouter_receipt) ||
      ('qseal_receipt' in raw && (raw as { qseal_receipt: unknown }).qseal_receipt) ||
      ('receipt' in raw && (raw as { receipt: unknown }).receipt)
    if (r && typeof r === 'object' && 'pqc' in r) return r as QSealReceipt
  }
  return null
}
