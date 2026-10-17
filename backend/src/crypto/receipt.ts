import crypto from 'crypto';
import { pqc, GatewayPublicKeys } from './pqc.js';
import { getDb } from '../store/db.js';

export interface QSealReceiptData {
  id: string;
  version: '1.0' | '2';
  timestamp: string;
  model: string;
  promptHash: string;
  responseHash: string;
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  payment: {
    type: 'x402-solana' | 'prepaid-key' | 'dev-bypass';
    reference?: string;
    signature?: string;
    amountUsdc: number;
  };
  sealed: boolean;
}

export interface QSealReceipt extends QSealReceiptData {
  pqc: {
    algorithm: 'ML-DSA-65/Ed25519-Hybrid';
    mlDsaPublicKey: string;
    ed25519PublicKey: string;
    mlDsaSignature: string;
    ed25519Signature: string;
  };
}

export interface ReceiptVerification {
  valid: boolean;
  mlDsaValid: boolean;
  ed25519Valid: boolean;
  /** The receipt names this gateway's published keys. */
  signerMatchesGateway: boolean;
  reason: string;
}

type PaymentType = QSealReceiptData['payment']['type'];

export class ReceiptManager {
  /**
   * The exact bytes that are signed.
   *
   * v2 (current) is a JSON array, so no field value can be confused with a
   * separator. v1 (pipe-joined) is still accepted for receipts issued before.
   */
  public static canonicalString(data: QSealReceiptData): string {
    if (data.version === '2') {
      return JSON.stringify([
        'qseal-receipt',
        data.version,
        data.id,
        data.timestamp,
        data.model,
        data.promptHash,
        data.responseHash,
        [data.tokens.promptTokens, data.tokens.completionTokens, data.tokens.totalTokens],
        [data.payment.type, data.payment.reference ?? null, data.payment.signature ?? null, data.payment.amountUsdc],
        data.sealed,
      ]);
    }
    return [
      `id:${data.id}`,
      `version:${data.version}`,
      `timestamp:${data.timestamp}`,
      `model:${data.model}`,
      `promptHash:${data.promptHash}`,
      `responseHash:${data.responseHash}`,
      `tokens:${data.tokens.promptTokens},${data.tokens.completionTokens},${data.tokens.totalTokens}`,
      `payment:${data.payment.type},${data.payment.reference || ''},${data.payment.signature || ''},${data.payment.amountUsdc}`,
      `sealed:${data.sealed}`,
    ].join('|');
  }

  /** Create, sign and store a receipt. Only hashes are kept, never prompt text. */
  public static create(
    model: string,
    promptHash: string,
    responseHash: string,
    tokens: { promptTokens: number; completionTokens: number; totalTokens: number },
    payment: { type: PaymentType; reference?: string; signature?: string; amountUsdc: number },
    sealed: boolean = false,
  ): QSealReceipt {
    const data: QSealReceiptData = {
      id: `rcpt_${crypto.randomUUID().replace(/-/g, '')}`,
      version: '2',
      timestamp: new Date().toISOString(),
      model,
      promptHash,
      responseHash,
      tokens,
      payment: {
        type: payment.type,
        ...(payment.reference ? { reference: payment.reference } : {}),
        ...(payment.signature ? { signature: payment.signature } : {}),
        amountUsdc: payment.amountUsdc,
      },
      sealed,
    };

    const sig = pqc.sign(this.canonicalString(data));
    const keys: GatewayPublicKeys = pqc.getPublicKeys();
    const receipt: QSealReceipt = {
      ...data,
      pqc: {
        algorithm: 'ML-DSA-65/Ed25519-Hybrid',
        mlDsaPublicKey: keys.mlDsaPublicKey,
        ed25519PublicKey: keys.ed25519PublicKey,
        mlDsaSignature: sig.mlDsaSignature,
        ed25519Signature: sig.ed25519Signature,
      },
    };

    getDb()
      .prepare('INSERT INTO receipts (id, body, created_at) VALUES (?, ?, ?)')
      .run(receipt.id, JSON.stringify(receipt), receipt.timestamp);
    return receipt;
  }

  public static get(id: string): QSealReceipt | undefined {
    const row = getDb().prepare('SELECT body FROM receipts WHERE id = ?').get(id) as { body: string } | undefined;
    return row ? (JSON.parse(row.body) as QSealReceipt) : undefined;
  }

  /**
   * Verify both signatures AND that the receipt was signed by this gateway.
   * Checking against the keys embedded in the receipt alone would accept a
   * receipt anyone signed with their own keys.
   */
  public static verify(receipt: QSealReceipt): ReceiptVerification {
    try {
      if (!receipt?.pqc || (receipt.version !== '1.0' && receipt.version !== '2')) {
        return { valid: false, mlDsaValid: false, ed25519Valid: false, signerMatchesGateway: false, reason: 'Unsupported receipt format' };
      }
      const keys = pqc.getPublicKeys();
      const signerMatchesGateway =
        receipt.pqc.mlDsaPublicKey === keys.mlDsaPublicKey && receipt.pqc.ed25519PublicKey === keys.ed25519PublicKey;

      const data: QSealReceiptData = {
        id: receipt.id,
        version: receipt.version,
        timestamp: receipt.timestamp,
        model: receipt.model,
        promptHash: receipt.promptHash,
        responseHash: receipt.responseHash,
        tokens: receipt.tokens,
        payment: receipt.payment,
        sealed: receipt.sealed,
      };
      const canonical = this.canonicalString(data);
      // Always check against the gateway's own keys.
      const mlDsaValid = pqc.verify(canonical, receipt.pqc.mlDsaSignature, keys.mlDsaPublicKey);
      const ed25519Valid = pqc.verifyEd25519(canonical, receipt.pqc.ed25519Signature, keys.ed25519PublicKey);
      const valid = signerMatchesGateway && mlDsaValid && ed25519Valid;

      return {
        valid,
        mlDsaValid,
        ed25519Valid,
        signerMatchesGateway,
        reason: valid
          ? 'Both signatures are valid and were made with this gateway’s published keys'
          : !signerMatchesGateway
            ? 'Receipt was not signed with this gateway’s published keys'
            : 'Signature verification failed: the receipt was altered or is not genuine',
      };
    } catch (err: any) {
      return { valid: false, mlDsaValid: false, ed25519Valid: false, signerMatchesGateway: false, reason: err?.message || 'Verification error' };
    }
  }

  public static getStats() {
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM receipts').get() as { n: number };
    return { totalReceiptsIssued: Number(row.n) };
  }
}
