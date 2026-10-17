import crypto from 'crypto';
import { pqc, GatewayPublicKeys } from './pqc.js';

export interface QSealReceiptData {
  id: string;
  version: '1.0';
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

// In-memory minimal receipt store (hashes and proof only, NEVER prompts)
const receiptStore = new Map<string, QSealReceipt>();

export class ReceiptManager {
  /**
   * Produce a canonical string representation for cryptographic signing
   */
  public static canonicalString(data: QSealReceiptData): string {
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

  /**
   * Create, sign and store an immutable post-quantum inference receipt
   */
  public static create(
    model: string,
    promptHash: string,
    responseHash: string,
    tokens: { promptTokens: number; completionTokens: number; totalTokens: number },
    payment: { type: 'x402-solana' | 'prepaid-key' | 'dev-bypass'; reference?: string; signature?: string; amountUsdc: number },
    sealed: boolean = false
  ): QSealReceipt {
    const id = `rcpt_${crypto.randomUUID().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();

    const data: QSealReceiptData = {
      id,
      version: '1.0',
      timestamp,
      model,
      promptHash,
      responseHash,
      tokens,
      payment,
      sealed,
    };

    const canonical = this.canonicalString(data);
    const sig = pqc.sign(canonical);
    const publicKeys: GatewayPublicKeys = pqc.getPublicKeys();

    const receipt: QSealReceipt = {
      ...data,
      pqc: {
        algorithm: 'ML-DSA-65/Ed25519-Hybrid',
        mlDsaPublicKey: publicKeys.mlDsaPublicKey,
        ed25519PublicKey: publicKeys.ed25519PublicKey,
        mlDsaSignature: sig.mlDsaSignature,
        ed25519Signature: sig.ed25519Signature,
      },
    };

    // Store receipt metadata (capped at last 10,000 to keep memory small)
    if (receiptStore.size > 10000) {
      const oldestKey = receiptStore.keys().next().value;
      if (oldestKey) receiptStore.delete(oldestKey);
    }
    receiptStore.set(id, receipt);

    return receipt;
  }

  /**
   * Retrieve receipt by ID
   */
  public static get(id: string): QSealReceipt | undefined {
    return receiptStore.get(id);
  }

  /**
   * Verify receipt cryptographic validity
   */
  public static verify(receipt: QSealReceipt): {
    valid: boolean;
    mlDsaValid: boolean;
    ed25519Valid: boolean;
    reason?: string;
  } {
    try {
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

      const mlDsaValid = pqc.verify(
        canonical,
        receipt.pqc.mlDsaSignature,
        receipt.pqc.mlDsaPublicKey
      );

      const ed25519Valid = pqc.verifyEd25519(
        canonical,
        receipt.pqc.ed25519Signature,
        receipt.pqc.ed25519PublicKey
      );

      return {
        valid: mlDsaValid && ed25519Valid,
        mlDsaValid,
        ed25519Valid,
        reason: mlDsaValid && ed25519Valid ? 'All cryptographic signatures valid' : 'Signature verification failed',
      };
    } catch (err: any) {
      return {
        valid: false,
        mlDsaValid: false,
        ed25519Valid: false,
        reason: err?.message || 'Verification exception',
      };
    }
  }

  /**
   * Export all recent receipts count/stats
   */
  public static getStats() {
    return {
      totalReceiptsIssued: receiptStore.size,
    };
  }
}
