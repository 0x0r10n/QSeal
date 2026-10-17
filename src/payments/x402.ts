import { Request, Response } from 'express';
import { Keypair } from '@solana/web3.js';
import { config } from '../config.js';
import { solanaVerifier, PaymentVerificationResult } from './solana.js';
import { PrepaidKeyManager } from './prepaid.js';

export interface X402V2PaymentRequired {
  x402Version: 2;
  accepts: Array<{
    scheme: 'exact';
    price: string; // e.g. "$0.001"
    network: string; // CAIP-2 e.g. "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
    payTo: string;
    asset: string; // USDC Mint address
    extra?: {
      reference: string;
      payToAta: string;
      token: 'USDC';
      decimals: number;
      amountNumeric: number;
      solanaPayUrl: string;
      expiresAt: number;
      memo: string;
    };
  }>;
  resource: {
    description: string;
    mimeType: string;
  };
}

export class X402Manager {
  /**
   * Generate an official x402 V2 payment challenge for an unpaid request
   */
  public static generateChallenge(modelName?: string): X402V2PaymentRequired {
    const priceUsdc = (modelName && config.modelPricing[modelName]) ? config.modelPricing[modelName] : config.pricePerRequestUsdc;
    const priceStr = `$${priceUsdc.toFixed(priceUsdc < 0.01 ? 4 : 2)}`;

    // Fresh unique reference keypair for Solana Pay / anti-replay matching
    const refKeypair = Keypair.generate();
    const reference = refKeypair.publicKey.toBase58();
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const memo = `qseal:infer:${Date.now()}`;
    const payToAta = solanaVerifier.getPayToAta();

    const solanaPayUrl = `solana:${config.payTo}?amount=${priceUsdc.toFixed(4)}&spl-token=${config.usdcMint}&reference=${reference}&memo=${encodeURIComponent(memo)}`;

    return {
      x402Version: 2,
      accepts: [
        {
          scheme: 'exact',
          price: priceStr,
          network: config.caip2Network,
          payTo: config.payTo,
          asset: config.usdcMint,
          extra: {
            reference,
            payToAta,
            token: 'USDC',
            decimals: 6,
            amountNumeric: priceUsdc,
            solanaPayUrl,
            expiresAt,
            memo,
          },
        },
      ],
      resource: {
        description: 'QSeal Quantum-Sealed Inference',
        mimeType: 'application/json',
      },
    };
  }

  /**
   * Send HTTP 402 Payment Required response conforming to official Solana x402 V2
   */
  public static send402Response(res: Response, challenge: X402V2PaymentRequired) {
    const accept = challenge.accepts[0];
    const base64Challenge = Buffer.from(JSON.stringify(challenge)).toString('base64');

    // Standard official x402 V2 Header
    res.setHeader('PAYMENT-REQUIRED', base64Challenge);
    res.setHeader('payment-required', base64Challenge);

    // Convenience & Solana Pay headers
    res.setHeader('X-Payment-Required', 'true');
    res.setHeader('X-402-Version', '2.0');
    res.setHeader('X-402-Network', accept.network);
    res.setHeader('X-402-Token', 'USDC');
    res.setHeader('X-402-Recipient', accept.payTo);
    res.setHeader('X-402-PayTo-ATA', accept.extra?.payToAta || accept.payTo);
    res.setHeader('X-402-Amount', accept.price);
    res.setHeader('X-402-Reference', accept.extra?.reference || '');
    if (accept.extra?.solanaPayUrl) {
      res.setHeader('X-402-Pay-Url', accept.extra.solanaPayUrl);
    }

    return res.status(402).json({
      x402Version: 2,
      error: {
        message: `Payment Required (x402). Pay ${accept.price} USDC on Solana (${accept.network}) to proceed.`,
        type: 'payment_required',
        code: 402,
        x402: challenge,
      },
    });
  }

  /**
   * Attach settlement confirmation header on successful completion
   */
  public static attachPaymentResponse(res: Response, result: PaymentVerificationResult) {
    const settlementPayload = {
      x402Version: 2,
      settled: true,
      network: config.caip2Network,
      signature: result.signature,
      type: result.type,
      amountUsdc: result.amountUsdc,
      timestamp: new Date().toISOString(),
    };
    const b64 = Buffer.from(JSON.stringify(settlementPayload)).toString('base64');
    res.setHeader('PAYMENT-RESPONSE', b64);
    res.setHeader('payment-response', b64);
  }

  /**
   * Extract and verify payment from request headers/auth
   * Supports:
   * 1. Official x402 V2 PAYMENT-SIGNATURE header (base64 JSON, plain JSON, or tx string)
   * 2. Direct headers: X-Payment-Signature, X-Payment-Reference
   * 3. Authorization Bearer prepaid key (qseal_sk_...)
   * 4. Authorization Bearer x402:<sig>:<ref>
   * 5. Dev bypass (when enabled)
   */
  public static async authenticateRequest(
    req: Request,
    modelName?: string
  ): Promise<PaymentVerificationResult> {
    const priceUsdc = (modelName && config.modelPricing[modelName]) ? config.modelPricing[modelName] : config.pricePerRequestUsdc;

    // 1. Check official x402 V2 PAYMENT-SIGNATURE / payment-signature header
    const x402SigHeader = (req.headers['payment-signature'] || req.headers['PAYMENT-SIGNATURE']) as string | undefined;
    if (x402SigHeader) {
      const parsed = this.parsePaymentSignatureHeader(x402SigHeader);
      if (parsed.signature) {
        return solanaVerifier.verifyPayment(parsed.signature, parsed.reference, priceUsdc);
      }
    }

    // 2. Check Authorization Bearer
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      // Check if it's a prepaid API key (qseal_sk_...)
      if (token.startsWith('qseal_sk_')) {
        const deductResult = PrepaidKeyManager.deduct(token, priceUsdc);
        if (deductResult.success) {
          const keyInfo = PrepaidKeyManager.getKey(token);
          return {
            verified: true,
            type: 'prepaid-key',
            amountUsdc: priceUsdc,
            payer: keyInfo?.walletAddress,
          };
        } else {
          return {
            verified: false,
            type: 'prepaid-key',
            amountUsdc: 0,
            error: deductResult.error || 'Prepaid key deduction failed',
          };
        }
      }

      // Check if bearer token is formatted as "x402:<sig>:<ref>" or "x402:<sig>"
      if (token.startsWith('x402:')) {
        const parts = token.slice(5).split(':');
        const sig = parts[0];
        const ref = parts[1];
        return solanaVerifier.verifyPayment(sig, ref, priceUsdc);
      }
    }

    // 3. Check direct payment headers (X-Payment-Signature, X-Payment-Reference)
    const paymentSigHeader = req.headers['x-payment-signature'] as string | undefined;
    const paymentRefHeader = req.headers['x-payment-reference'] as string | undefined;
    if (paymentSigHeader || paymentRefHeader) {
      return solanaVerifier.verifyPayment(paymentSigHeader, paymentRefHeader, priceUsdc);
    }

    // 4. Check dev bypass in dev/test mode
    const devBypassHeader = req.headers['x-dev-bypass'] as string | undefined;
    if (config.allowDevBypass && (devBypassHeader === 'true' || req.query['dev_bypass'] === 'true')) {
      return {
        verified: true,
        type: 'dev-bypass',
        amountUsdc: priceUsdc,
        payer: 'DevBypassWallet',
      };
    }

    // Unpaid request
    return {
      verified: false,
      type: 'x402-solana',
      amountUsdc: 0,
      error: 'No payment proof provided',
    };
  }

  /**
   * Helper to parse PAYMENT-SIGNATURE header from base64 JSON, plain JSON, or raw string
   */
  private static parsePaymentSignatureHeader(raw: string): { signature?: string; reference?: string } {
    const trimmed = raw.trim();

    // Try base64 decoding
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.startsWith('{')) {
        const json = JSON.parse(decoded);
        return {
          signature: json.signature || json.tx || json.transaction || json.txSignature,
          reference: json.reference || json.extra?.reference,
        };
      }
    } catch {}

    // Try JSON parsing directly
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        return {
          signature: json.signature || json.tx || json.transaction,
          reference: json.reference,
        };
      } catch {}
    }

    // Otherwise raw signature string (Base58 tx hash)
    return { signature: trimmed };
  }
}
