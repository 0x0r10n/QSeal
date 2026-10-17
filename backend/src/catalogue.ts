import { config, hasUpstream, type UpstreamProvider } from './config.js';

/**
 * The models QSeal offers, their price, and which upstream model serves each
 * one per provider. A model is only listed (and accepted) when the active
 * provider has a mapping for it, so callers never get a silent substitute.
 */
export interface CatalogueModel {
  id: string;
  description: string;
  /** Multiplier on PRICE_PER_REQUEST_USDC. */
  priceFactor: number;
  contextWindow: number;
  upstream: Partial<Record<UpstreamProvider, string>>;
}

export const CATALOGUE: CatalogueModel[] = [
  {
    id: 'qseal-quantum-70b',
    description: 'General-purpose 70B instruction model. Default.',
    priceFactor: 1,
    contextWindow: 131072,
    upstream: {
      groq: 'llama-3.3-70b-versatile',
      openrouter: 'meta-llama/llama-3.3-70b-instruct',
      together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    },
  },
  {
    id: 'qseal-llama-3.3-70b',
    description: 'Llama 3.3 70B Instruct.',
    priceFactor: 1,
    contextWindow: 131072,
    upstream: {
      groq: 'llama-3.3-70b-versatile',
      openrouter: 'meta-llama/llama-3.3-70b-instruct',
      together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    },
  },
  {
    id: 'qseal-deepseek-r1',
    description: 'DeepSeek R1 reasoning model.',
    priceFactor: 2,
    contextWindow: 65536,
    upstream: {
      groq: 'deepseek-r1-distill-llama-70b',
      openrouter: 'deepseek/deepseek-r1',
      together: 'deepseek-ai/DeepSeek-R1',
      fireworks: 'accounts/fireworks/models/deepseek-r1',
    },
  },
  {
    id: 'qseal-llama-3.1-8b',
    description: 'Small, fast Llama 3.1 8B Instruct.',
    priceFactor: 0.5,
    contextWindow: 131072,
    upstream: {
      groq: 'llama-3.1-8b-instant',
      openrouter: 'meta-llama/llama-3.1-8b-instruct',
      together: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      fireworks: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    },
  },
];

/** Custom providers expose their own model ids through UPSTREAM_MODEL_MAP="qseal-id=upstream-id,…". */
function customMap(): Record<string, string> {
  const raw = process.env.UPSTREAM_MODEL_MAP || '';
  return Object.fromEntries(
    raw.split(',').map((p) => p.split('=').map((s) => s.trim())).filter((p) => p.length === 2 && p[0] && p[1]),
  );
}

export function upstreamModelFor(id: string): string | undefined {
  const provider = config.upstreamProvider;
  if (!provider || !hasUpstream()) return config.allowDevBypass ? 'dev-engine' : undefined;
  if (provider === 'custom') return customMap()[id];
  return CATALOGUE.find((m) => m.id === id)?.upstream[provider];
}

export function priceFor(id: string): number {
  const m = CATALOGUE.find((x) => x.id === id);
  return +(config.pricePerRequestUsdc * (m?.priceFactor ?? 1)).toFixed(6);
}

/** Models that can actually be served right now. */
export function availableModels(): CatalogueModel[] {
  return CATALOGUE.filter((m) => upstreamModelFor(m.id) !== undefined);
}

export function isAvailable(id: string): boolean {
  return availableModels().some((m) => m.id === id);
}
