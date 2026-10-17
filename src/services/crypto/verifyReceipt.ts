/**
 * Independent, in-browser receipt verification. Checks the ML-DSA-65 and
 * Ed25519 signatures over the receipt's canonical form using the keys the
 * gateway publishes, so a receipt carrying someone else's keys fails.
 */
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { ed25519 } from '@noble/curves/ed25519'
import type { GatewayKeys, QSealReceipt } from '@/types/api'
import { hexToBytes } from './bytes'

/** Must match backend/src/crypto/receipt.ts canonicalString(). */
export function canonicalString(r: QSealReceipt): string {
  if (r.version === '2') {
    return JSON.stringify([
      'qseal-receipt',
      r.version,
      r.id,
      r.timestamp,
      r.model,
      r.promptHash,
      r.responseHash,
      [r.tokens.promptTokens, r.tokens.completionTokens, r.tokens.totalTokens],
      [r.payment.type, r.payment.reference ?? null, r.payment.signature ?? null, r.payment.amountUsdc],
      r.sealed,
    ])
  }
  return [
    `id:${r.id}`,
    `version:${r.version}`,
    `timestamp:${r.timestamp}`,
    `model:${r.model}`,
    `promptHash:${r.promptHash}`,
    `responseHash:${r.responseHash}`,
    `tokens:${r.tokens.promptTokens},${r.tokens.completionTokens},${r.tokens.totalTokens}`,
    `payment:${r.payment.type},${r.payment.reference || ''},${r.payment.signature || ''},${r.payment.amountUsdc}`,
    `sealed:${r.sealed}`,
  ].join('|')
}

export function isReceiptShape(x: unknown): x is QSealReceipt {
  const r = x as QSealReceipt
  return Boolean(
    r && typeof r === 'object' &&
      typeof r.id === 'string' &&
      (r.version === '1.0' || r.version === '2') &&
      r.tokens && r.payment && r.pqc &&
      typeof r.pqc.mlDsaSignature === 'string' &&
      typeof r.pqc.ed25519Signature === 'string',
  )
}

export interface LocalVerification {
  valid: boolean
  mlDsaValid: boolean
  ed25519Valid: boolean
  signerMatchesGateway: boolean
}

export function verifyLocally(receipt: QSealReceipt, keys: GatewayKeys): LocalVerification {
  const msg = new TextEncoder().encode(canonicalString(receipt))
  const signerMatchesGateway =
    receipt.pqc.mlDsaPublicKey === keys.mlDsaPublicKey && receipt.pqc.ed25519PublicKey === keys.ed25519PublicKey
  let mlDsaValid = false
  let ed25519Valid = false
  try {
    mlDsaValid = ml_dsa65.verify(hexToBytes(keys.mlDsaPublicKey), msg, hexToBytes(receipt.pqc.mlDsaSignature))
  } catch {
    mlDsaValid = false
  }
  try {
    ed25519Valid = ed25519.verify(hexToBytes(receipt.pqc.ed25519Signature), msg, hexToBytes(keys.ed25519PublicKey))
  } catch {
    ed25519Valid = false
  }
  return { valid: signerMatchesGateway && mlDsaValid && ed25519Valid, mlDsaValid, ed25519Valid, signerMatchesGateway }
}
