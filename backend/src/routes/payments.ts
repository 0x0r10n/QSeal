import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { config } from '../config.js';
import { priceFor, isAvailable } from '../catalogue.js';
import { solanaVerifier } from '../payments/solana.js';

/**
 * POST /v1/payments/prepare — build an unsigned USDC transfer for a browser wallet.
 * Body: { payer, purpose: 'request' | 'deposit', model?, amount_usdc? }
 */
export async function handlePreparePayment(req: Request, res: Response) {
  const { payer, purpose, model, amount_usdc } = req.body ?? {};
  try {
    new PublicKey(String(payer));
  } catch {
    return res.status(400).json({ error: { message: 'payer must be a Solana address', type: 'invalid_request_error' } });
  }

  let amount: number;
  if (purpose === 'deposit') {
    if (typeof amount_usdc !== 'number' || !(amount_usdc >= config.minPrepaidDepositUsdc) || amount_usdc > 10_000) {
      return res.status(400).json({
        error: { message: `amount_usdc must be between ${config.minPrepaidDepositUsdc} and 10000`, type: 'invalid_request_error' },
      });
    }
    amount = +amount_usdc.toFixed(6);
  } else {
    const m = typeof model === 'string' ? model : config.defaultModel;
    if (!isAvailable(m)) return res.status(404).json({ error: { message: `Model not available: ${m}`, type: 'model_not_found' } });
    amount = priceFor(m);
  }

  try {
    const { transaction, reference } = await solanaVerifier.buildTransfer(String(payer), amount);
    return res.status(200).json({
      transaction,
      reference,
      amount_usdc: amount,
      network: config.solanaNetwork,
      caip2: config.caip2Network,
      wallet_chain: config.walletChain,
      pay_to: config.payTo,
      usdc_mint: config.usdcMint,
    });
  } catch (err: any) {
    const treasuryInvalid = (() => {
      try {
        new PublicKey(config.payTo);
        return false;
      } catch {
        return true;
      }
    })();
    return res.status(503).json({
      error: {
        message: treasuryInvalid ? 'Treasury wallet (SOLANA_PAY_TO) is not configured' : `Could not prepare transaction: ${err?.message || err}`,
        type: 'payment_unavailable',
      },
    });
  }
}
