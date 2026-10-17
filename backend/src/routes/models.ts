import { Request, Response } from 'express';
import { config, hasUpstream } from '../config.js';
import { availableModels, priceFor, upstreamModelFor } from '../catalogue.js';

export function handleListModels(_req: Request, res: Response) {
  const provider = hasUpstream() ? config.upstreamProvider : config.allowDevBypass ? 'dev-engine' : undefined;
  return res.status(200).json({
    object: 'list',
    data: availableModels().map((m) => ({
      id: m.id,
      object: 'model',
      created: 1715000000,
      owned_by: 'qseal',
      description: m.description,
      pricing: { price_per_request_usdc: priceFor(m.id), scheme: 'exact', currency: 'USDC' },
      capabilities: {
        context_window: m.contextWindow,
        sealed_prompts: 'ML-KEM-768 + AES-256-GCM (client to gateway)',
        receipt_signature: 'ML-DSA-65 + Ed25519',
        x402_solana_v2: true,
        prepaid_keys: true,
      },
      // Transparency: which provider and upstream model serve this id.
      served_by: { provider, upstream_model: upstreamModelFor(m.id) },
    })),
  });
}
