/**
 * Cross-checks the browser crypto against the gateway implementation in
 * backend/src, so the two can never drift apart silently.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { sealRequest, openSealedResponse } from './seal'
import { verifyLocally, canonicalString } from './verifyReceipt'
import { toBase58 } from './bytes'
import type { GatewayKeys, QSealReceipt } from '@/types/api'

/* eslint-disable @typescript-eslint/no-explicit-any */
let backend: { pqc: any; PromptSealer: any; ReceiptManager: any }

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qseal-compat-'))
  process.env.PQC_KEYS_FILE = path.join(dir, 'keys.json')
  process.env.DATABASE_PATH = ':memory:'
  const [{ pqc }, { PromptSealer }, { ReceiptManager }] = await Promise.all([
    import('../../../backend/src/crypto/pqc'),
    import('../../../backend/src/crypto/seal'),
    import('../../../backend/src/crypto/receipt'),
  ])
  backend = { pqc, PromptSealer, ReceiptManager }
})

const keys = (): GatewayKeys => backend.pqc.getPublicKeys()

describe('sealing is compatible with the gateway', () => {
  it('the gateway can open a request sealed in the browser', async () => {
    const body = { model: 'qseal-quantum-70b', messages: [{ role: 'user', content: 'sealed ✓ ünïcode' }] }
    const { payload } = await sealRequest(body, keys().mlKemPublicKey)
    expect(backend.PromptSealer.unseal(payload)).toEqual(body)
  })

  it('the browser can open a response the gateway sealed back', async () => {
    const { payload, clientSecretKey } = await sealRequest({ x: 1 }, keys().mlKemPublicKey)
    const reply = { choices: [{ message: { content: 'hello' } }] }
    const sealedReply = backend.PromptSealer.sealResponse(reply, payload.clientEphemeralKemPubkey)
    expect(await openSealedResponse(sealedReply, clientSecretKey)).toEqual(reply)
  })
})

describe('receipt verification matches the gateway', () => {
  const issue = (): QSealReceipt =>
    backend.ReceiptManager.create('qseal-quantum-70b', 'a'.repeat(64), 'b'.repeat(64), { promptTokens: 3, completionTokens: 5, totalTokens: 8 }, { type: 'prepaid-key', amountUsdc: 0.001 }, true)

  it('uses the same canonical form', () => {
    const r = issue()
    expect(canonicalString(r)).toBe(backend.ReceiptManager.canonicalString(r))
  })

  it('accepts a genuine receipt', () => {
    expect(verifyLocally(issue(), keys())).toEqual({ valid: true, mlDsaValid: true, ed25519Valid: true, signerMatchesGateway: true })
  })

  it('rejects any altered field', () => {
    const r = issue()
    for (const tampered of [
      { ...r, model: 'qseal-deepseek-r1' },
      { ...r, tokens: { ...r.tokens, totalTokens: 9 } },
      { ...r, payment: { ...r.payment, amountUsdc: 0 } },
      { ...r, sealed: false },
    ]) {
      expect(verifyLocally(tampered, keys()).valid).toBe(false)
    }
  })

  it('rejects a receipt that names other keys', () => {
    const r = issue()
    const other = { ...r, pqc: { ...r.pqc, ed25519PublicKey: '00'.repeat(32) } }
    expect(verifyLocally(other, keys())).toMatchObject({ valid: false, signerMatchesGateway: false })
  })
})

describe('base58', () => {
  it('encodes like the Solana tooling', () => {
    expect(toBase58(new Uint8Array(32))).toBe('11111111111111111111111111111111')
    expect(toBase58(new Uint8Array([0, 0, 1]))).toBe('112')
    expect(toBase58(new TextEncoder().encode('hello world'))).toBe('StV1DL6CwTryKyV')
  })
})
