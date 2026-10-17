import { Request, Response } from 'express';
import { config } from '../config.js';

export function handleListModels(req: Request, res: Response) {
  const models = [
    {
      id: 'qseal-quantum-70b',
      object: 'model',
      created: 1715000000,
      owned_by: 'qseal',
      permission: [],
      root: 'qseal-quantum-70b',
      parent: null,
      pricing: {
        price_per_request_usdc: config.modelPricing['qseal-quantum-70b'] || config.pricePerRequestUsdc,
        scheme: 'exact',
        currency: 'USDC',
      },
      capabilities: {
        quantum_sealed: true,
        pqc_kem: 'NIST ML-KEM-768',
        pqc_signature: 'NIST ML-DSA-65',
        zero_logging: true,
        x402_solana_v2: true,
        context_window: 131072,
        upstream_routed: Boolean(config.upstreamApiKey),
      },
    },
    {
      id: 'qseal-llama-3.3-70b',
      object: 'model',
      created: 1715000000,
      owned_by: 'qseal',
      permission: [],
      root: 'qseal-llama-3.3-70b',
      parent: null,
      pricing: {
        price_per_request_usdc: config.modelPricing['qseal-llama-3.3-70b'] || config.pricePerRequestUsdc,
        scheme: 'exact',
        currency: 'USDC',
      },
      capabilities: {
        quantum_sealed: true,
        pqc_kem: 'NIST ML-KEM-768',
        pqc_signature: 'NIST ML-DSA-65',
        zero_logging: true,
        x402_solana_v2: true,
        context_window: 131072,
        upstream_routed: Boolean(config.upstreamApiKey),
      },
    },
    {
      id: 'qseal-deepseek-r1',
      object: 'model',
      created: 1715000000,
      owned_by: 'qseal',
      permission: [],
      root: 'qseal-deepseek-r1',
      parent: null,
      pricing: {
        price_per_request_usdc: config.modelPricing['qseal-deepseek-r1'] || config.pricePerRequestUsdc * 2,
        scheme: 'exact',
        currency: 'USDC',
      },
      capabilities: {
        quantum_sealed: true,
        pqc_kem: 'NIST ML-KEM-768',
        pqc_signature: 'NIST ML-DSA-65',
        zero_logging: true,
        x402_solana_v2: true,
        context_window: 65536,
        upstream_routed: Boolean(config.upstreamApiKey),
      },
    },
    {
      id: 'gpt-4o-mini',
      object: 'model',
      created: 1715000000,
      owned_by: 'openai',
      permission: [],
      root: 'gpt-4o-mini',
      parent: null,
      pricing: {
        price_per_request_usdc: config.modelPricing['gpt-4o-mini'] || config.pricePerRequestUsdc,
        scheme: 'exact',
        currency: 'USDC',
      },
      capabilities: {
        quantum_sealed: true,
        pqc_kem: 'NIST ML-KEM-768',
        pqc_signature: 'NIST ML-DSA-65',
        zero_logging: true,
        x402_solana_v2: true,
        context_window: 128000,
        upstream_routed: Boolean(config.upstreamApiKey),
      },
    },
  ];

  return res.status(200).json({
    object: 'list',
    data: models,
  });
}
