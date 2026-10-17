import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export type UpstreamProvider = 'groq' | 'openrouter' | 'together' | 'fireworks' | 'custom';

export interface QSealConfig {
  port: number;
  host: string;
  isProduction: boolean;
  solanaNetwork: 'mainnet-beta' | 'devnet';
  caip2Network: string; // Standard CAIP-2 identifier
  /** Wallet Standard chain id used by browser wallets. */
  walletChain: 'solana:mainnet' | 'solana:devnet';
  solanaRpcUrl: string;
  payTo: string; // Solana recipient address (SOLANA_PAY_TO or SOLANA_TREASURY_ADDRESS)
  usdcMint: string;
  pricePerRequestUsdc: number; // default in USDC
  minPrepaidDepositUsdc: number;
  maxPaymentAgeSec: number;
  upstreamProvider?: UpstreamProvider;
  upstreamBaseUrl?: string;
  upstreamApiKey?: string;
  upstreamTimeoutMs: number;
  defaultModel: string;
  /** Development only: free requests, simulated payments, a labelled echo engine. Never in production. */
  allowDevBypass: boolean;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  keysFilePath: string;
  databasePath: string;
  corsOrigins: '*' | string[];
  trustProxy: string | boolean;
  serveFrontendDir?: string;
}

const isProduction = process.env.NODE_ENV === 'production';
const network = (process.env.SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet') as 'mainnet-beta' | 'devnet';

// Standard CAIP-2 Chain IDs for Solana
const caip2 = network === 'mainnet-beta'
  ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
  : 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

// Auto-detect upstream provider
let detectedProvider: UpstreamProvider | undefined;
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
} else if (detectedApiKey && detectedBaseUrl) {
  detectedProvider = 'custom';
}

const num = (v: string | undefined, fallback: number) => {
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const corsRaw = (process.env.CORS_ORIGINS || '*').trim();
const trustProxyRaw = process.env.TRUST_PROXY;

const DEV_PAY_TO = 'QSeaL11111111111111111111111111111111111111';

export const config: QSealConfig = {
  port: num(process.env.PORT, 4020),
  host: process.env.HOST || '0.0.0.0',
  isProduction,
  solanaNetwork: network,
  caip2Network: caip2,
  walletChain: network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || (network === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com'),
  payTo: process.env.SOLANA_PAY_TO || process.env.SOLANA_TREASURY_ADDRESS || DEV_PAY_TO,
  usdcMint: network === 'mainnet-beta'
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  pricePerRequestUsdc: num(process.env.PRICE_PER_REQUEST_USDC, 0.001),
  minPrepaidDepositUsdc: num(process.env.MIN_PREPAID_DEPOSIT_USDC, 1),
  maxPaymentAgeSec: num(process.env.MAX_PAYMENT_AGE_SEC, 900),
  upstreamProvider: detectedProvider,
  upstreamBaseUrl: detectedBaseUrl,
  upstreamApiKey: detectedApiKey,
  upstreamTimeoutMs: num(process.env.UPSTREAM_TIMEOUT_MS, 120_000),
  defaultModel: process.env.DEFAULT_MODEL || 'qseal-quantum-70b',
  allowDevBypass: process.env.ALLOW_DEV_BYPASS === 'true',
  rateLimitMax: num(process.env.RATE_LIMIT_MAX, 60),
  rateLimitWindowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  keysFilePath: process.env.PQC_KEYS_FILE || path.resolve(process.cwd(), '.qseal_keys.json'),
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'qseal.db'),
  corsOrigins: corsRaw === '*' ? '*' : corsRaw.split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy:
    trustProxyRaw === undefined || trustProxyRaw === '' ? false
      : trustProxyRaw === 'true' ? true
        : trustProxyRaw === 'false' ? false
          : trustProxyRaw,
  serveFrontendDir: process.env.SERVE_FRONTEND_DIR ? path.resolve(process.env.SERVE_FRONTEND_DIR) : undefined,
};

/** True when a real model provider is configured. */
export const hasUpstream = () => Boolean(config.upstreamApiKey && config.upstreamBaseUrl);

/**
 * Refuse to start with settings that would give away inference or lose money.
 * Returns a list of problems; the server exits if any are found in production.
 */
export function validateProductionConfig(): string[] {
  const problems: string[] = [];
  if (!config.isProduction) return problems;
  if (config.allowDevBypass) problems.push('ALLOW_DEV_BYPASS must not be true in production.');
  if (config.payTo === DEV_PAY_TO) problems.push('SOLANA_PAY_TO must be set to your treasury wallet.');
  if (!hasUpstream()) problems.push('No model provider configured (set GROQ_API_KEY, OPENROUTER_API_KEY, TOGETHER_API_KEY, FIREWORKS_API_KEY, or UPSTREAM_API_KEY + UPSTREAM_BASE_URL).');
  if (!process.env.SOLANA_RPC_URL) problems.push('SOLANA_RPC_URL should point at a dedicated RPC provider; the public endpoint is rate limited.');
  return problems;
}
