import { Request, Response } from 'express';
import { PrepaidKeyManager } from '../payments/prepaid.js';
import { config } from '../config.js';

export function handleCreatePrepaidKey(req: Request, res: Response) {
  const { wallet, amount_usdc } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({
      error: 'Solana wallet address is required',
    });
  }

  const deposit = typeof amount_usdc === 'number' && amount_usdc > 0 ? amount_usdc : 1.0;
  const record = PrepaidKeyManager.createKey(wallet, deposit);

  return res.status(201).json({
    message: 'Prepaid API key created successfully',
    api_key: record.apiKey,
    wallet_address: record.walletAddress,
    balance_usdc: record.balanceUsdc,
    estimated_requests: Math.floor(record.balanceUsdc / config.pricePerRequestUsdc),
    price_per_request_usdc: config.pricePerRequestUsdc,
    created_at: record.createdAt,
    usage_instructions: 'Set header: Authorization: Bearer ' + record.apiKey,
  });
}

export function handleGetKeyBalance(req: Request, res: Response) {
  const key = String(req.params.key);
  const record = PrepaidKeyManager.getKey(key);

  if (!record) {
    return res.status(404).json({
      error: 'API key not found',
    });
  }

  return res.status(200).json({
    wallet_address: record.walletAddress,
    balance_usdc: record.balanceUsdc,
    total_spent_usdc: record.totalSpentUsdc,
    total_requests: record.totalRequests,
    estimated_requests_remaining: Math.floor(record.balanceUsdc / config.pricePerRequestUsdc),
    created_at: record.createdAt,
    last_used_at: record.lastUsedAt,
  });
}
