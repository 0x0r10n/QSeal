import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface QSealConfig {
  port: number;
  host: string;
  solanaNetwork: 'mainnet-beta' | 'devnet';
  caip2Network: string; // Standard CAIP-2 identifier
  solanaRpcUrl: string;
  payTo: string; // Solana recipient address (SOLANA_PAY_TO or SOLANA_TREASURY_ADDRESS)
  usdcMint: string;
  pricePerRequestUsdc: number; // default in USDC
  modelPricing: Record<string, number>;
  upstreamProvider?: 'groq' | 'openrouter' | 'together' | 'fireworks' | 'custom';
  upstreamBaseUrl?: string;
  upstreamApiKey?: string;
  defaultModel: string;
  allowDevBypass: boolean;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  keysFilePath: string;
}

const network = (process.env.SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet') as 'mainnet-beta' | 'devnet';

// Standard CAIP-2 Chain IDs for Solana
const caip2 = network === 'mainnet-beta'
  ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
  : 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

// Auto-detect upstream provider
let detectedProvider: 'groq' | 'openrouter' | 'together' | 'fireworks' | 'custom' | undefined;
let detectedBaseUrl = process.env.UPSTREAM_BASE_URL || process.env.OPENAI_BASE_URL;
let detectedApiKey = process.env.UPSTREAM_API_KEY || process.env.OPENAI_API_KEY;

if (process.env.GROQ_API_KEY) {
  detectedProvider = 'groq';
  detectedApiKey = process.env.GROQ_API_KEY;
  detectedBaseUrl = detectedBaseUrl || 'https://api.groq.com/openai/v1';
} else if (process.env.OPENROUTER_API_KEY) {
  detectedProvider = 'openrouter';
  detectedApiKey = process.env.OPENROUTER_API_KEY;
  detectedBaseUrl = detectedBaseUrl || 'https://openrouter.ai/api/v1';
} else if (process.env.TOGETHER_API_KEY) {
  detectedProvider = 'together';
  detectedApiKey = process.env.TOGETHER_API_KEY;
  detectedBaseUrl = detectedBaseUrl || 'https://api.together.xyz/v1';
} else if (process.env.FIREWORKS_API_KEY) {
  detectedProvider = 'fireworks';
  detectedApiKey = process.env.FIREWORKS_API_KEY;
  detectedBaseUrl = detectedBaseUrl || 'https://api.fireworks.ai/inference/v1';
} else if (detectedApiKey) {
  detectedProvider = 'custom';
}

const defaultPrice = parseFloat(process.env.PRICE_PER_REQUEST_USDC || '0.001');

export const config: QSealConfig = {
  port: parseInt(process.env.PORT || '4020', 10),
  host: process.env.HOST || '0.0.0.0',
  solanaNetwork: network,
  caip2Network: caip2,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || (network === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com'),
  payTo: process.env.SOLANA_PAY_TO || process.env.SOLANA_TREASURY_ADDRESS || 'QSeaL11111111111111111111111111111111111111',
  usdcMint: network === 'mainnet-beta'
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  pricePerRequestUsdc: defaultPrice,
  modelPricing: {
    'qseal-quantum-70b': defaultPrice,
    'qseal-llama-3.3-70b': defaultPrice,
    'qseal-deepseek-r1': defaultPrice * 2,
    'gpt-4o-mini': defaultPrice,
  },
  upstreamProvider: detectedProvider,
  upstreamBaseUrl: detectedBaseUrl,
  upstreamApiKey: detectedApiKey,
  defaultModel: process.env.DEFAULT_MODEL || 'qseal-quantum-70b',
  allowDevBypass: process.env.ALLOW_DEV_BYPASS === 'true' || process.env.NODE_ENV !== 'production',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  keysFilePath: process.env.PQC_KEYS_FILE || path.resolve(process.cwd(), '.qseal_keys.json'),
};
