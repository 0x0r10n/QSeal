import { Request, Response } from 'express';
import { PrepaidKeyManager, isPrepaidKey } from '../payments/prepaid.js';
import { solanaVerifier } from '../payments/solana.js';
import { config } from '../config.js';
import { priceFor } from '../catalogue.js';

const err = (res: Response, status: number, message: string, type = 'invalid_request_error') =>
  res.status(status).json({ error: { message, type } });

function bearerKey(req: Request): string | null {
  const h = req.headers['authorization'];
  const token = typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  return isPrepaidKey(token) ? token : null;
}

function readProof(body: any): { signature?: string; reference?: string } {
  const signature = typeof body?.payment_signature === 'string' ? body.payment_signature.trim() : undefined;
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : undefined;
  return { signature: signature || undefined, reference: reference || undefined };
}

function describe(record: NonNullable<ReturnType<typeof PrepaidKeyManager.getKey>>) {
  return {
    wallet_address: record.walletAddress,
    balance_usdc: record.balanceUsdc,
    total_spent_usdc: record.totalSpentUsdc,
    total_requests: record.totalRequests,
    estimated_requests_remaining: Math.floor(record.balanceUsdc / priceFor(config.defaultModel)),
    created_at: record.createdAt,
    last_used_at: record.lastUsedAt,
  };
}

/**
 * POST /v1/keys/prepaid — buy a key with an on-chain USDC deposit.
 * Body: { payment_signature, reference? }. The key is returned once and
 * stored only as a hash.
 */
export async function handleCreatePrepaidKey(req: Request, res: Response) {
  let deposit: number;
  let wallet: string;

  if (config.allowDevBypass && req.body?.dev === true) {
    deposit = typeof req.body.amount_usdc === 'number' && req.body.amount_usdc > 0 ? Math.min(req.body.amount_usdc, 100) : 1;
    wallet = typeof req.body.wallet === 'string' ? req.body.wallet : 'DevWallet';
  } else {
    const { signature, reference } = readProof(req.body);
    if (!signature && !reference) {
      return err(res, 402, `Send at least ${config.minPrepaidDepositUsdc} USDC to the treasury and pass its transaction signature as payment_signature.`, 'payment_required');
    }
    const result = await solanaVerifier.verifyPayment(signature, reference, config.minPrepaidDepositUsdc);
    if (!result.verified) return err(res, 402, result.error || 'Deposit could not be verified', 'payment_required');
    deposit = result.amountUsdc;
    wallet = result.payer || 'unknown';
  }

  const { apiKey, record } = PrepaidKeyManager.createKey(wallet, deposit);
  return res.status(201).json({
    message: 'Prepaid API key created. Store it now; it will not be shown again.',
    api_key: apiKey,
    ...describe(record),
    price_per_request_usdc: priceFor(config.defaultModel),
    usage_instructions: 'Send header: Authorization: Bearer <api_key>',
  });
}

/** POST /v1/keys/topup — add an on-chain deposit to an existing key (Authorization: Bearer key). */
export async function handleTopUpKey(req: Request, res: Response) {
  const key = bearerKey(req);
  if (!key || !PrepaidKeyManager.getKey(key)) return err(res, 401, 'Valid prepaid key required in Authorization header', 'authentication_error');
  const { signature, reference } = readProof(req.body);
  if (!signature && !reference) return err(res, 400, 'payment_signature is required');
  const result = await solanaVerifier.verifyPayment(signature, reference, priceFor(config.defaultModel));
  if (!result.verified) return err(res, 402, result.error || 'Deposit could not be verified', 'payment_required');
  PrepaidKeyManager.deposit(key, result.amountUsdc);
  return res.status(200).json({ credited_usdc: result.amountUsdc, ...describe(PrepaidKeyManager.getKey(key)!) });
}

/** GET /v1/keys/balance — Authorization: Bearer key. Keeps the secret out of URLs and logs. */
export function handleGetBalance(req: Request, res: Response) {
  const key = bearerKey(req);
  const record = key ? PrepaidKeyManager.getKey(key) : undefined;
  if (!record) return err(res, 401, 'Valid prepaid key required in Authorization header', 'authentication_error');
  return res.status(200).json(describe(record));
}

/** Deprecated: GET /v1/keys/:key/balance. Kept for existing clients; the path is redacted in logs. */
export function handleGetKeyBalance(req: Request, res: Response) {
  const key = String(req.params.key);
  const record = isPrepaidKey(key) ? PrepaidKeyManager.getKey(key) : undefined;
  if (!record) return err(res, 404, 'API key not found', 'not_found');
  return res.status(200).json(describe(record));
}
