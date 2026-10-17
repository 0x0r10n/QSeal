import { Request, Response } from 'express';
import { pqc } from '../crypto/pqc.js';
import { config } from '../config.js';
import { solanaVerifier } from '../payments/solana.js';

export function handleGetQuantumKeys(req: Request, res: Response) {
  const publicKeys = pqc.getPublicKeys();

  return res.status(200).json({
    gateway: 'QSeal Autonomous Inference Gateway',
    version: '1.0.0',
    verification_endpoints: {
      well_known: '/.well-known/qseal-keys.json',
      quantum_keys: '/v1/quantum-keys',
      receipt_verify: '/v1/receipts/verify',
    },
    ...publicKeys,
    standards: {
      kem: 'NIST FIPS 203 (ML-KEM-768 / Kyber-768)',
      signature: 'NIST FIPS 204 (ML-DSA-65 / Dilithium-3)',
      hybrid: 'Ed25519 (RFC 8032)',
      payment: 'x402 Protocol V2 on Solana Virtual Machine (SVM)',
    },
    solana: {
      network: config.solanaNetwork,
      caip2: config.caip2Network,
      payTo: config.payTo,
      payToAta: solanaVerifier.getPayToAta(),
      usdcMint: config.usdcMint,
    },
    how_to_verify_receipt: {
      method: 'POST /v1/receipts/verify',
      body: {
        receipt_id: 'rcpt_...',
      },
      client_side_noble: `
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
const isValid = ml_dsa65.verify(
  Buffer.from(mlDsaPublicKey, 'hex'),
  new TextEncoder().encode(canonicalReceiptString),
  Buffer.from(mlDsaSignature, 'hex')
);
      `.trim(),
    },
  });
}
