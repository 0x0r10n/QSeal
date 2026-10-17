import { config, hasUpstream, type UpstreamProvider } from './config.js';

/**
 * The models QSeal offers, their price, and which upstream model serves each
 * one per provider. A model is only listed (and accepted) when the active
 * provider has a mapping for it, so callers never get a silent substitute.
 */
export interface CatalogueModel {
  id: string;
  /** Underlying open model, as its vendor names it. */
  family: string;
  /** Where a provider serves a different variant, its honest name there. */
  familyByProvider?: Partial<Record<UpstreamProvider, string>>;
  /** Who made the underlying model (used for display, e.g. logos). */
  vendor: 'meta' | 'deepseek';
  description: string;
  /** Multiplier on PRICE_PER_REQUEST_USDC. */
  priceFactor: number;
  contextWindow: number;
  upstream: Partial<Record<UpstreamProvider, string>>;
}

export const CATALOGUE: CatalogueModel[] = [
  {
    id: 'qrouter-quantum-70b',
    family: 'Llama 3.3 70B Instruct',
    vendor: 'meta',
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
    id: 'qrouter-llama-3.3-70b',
    family: 'Llama 3.3 70B Instruct',
    vendor: 'meta',
    description: 'Meta’s Llama 3.3 70B, addressed by its own name.',
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
    id: 'qrouter-deepseek-r1',
    family: 'DeepSeek R1',
    familyByProvider: { groq: 'DeepSeek R1 Distill Llama 70B' },
    vendor: 'deepseek',
    description: 'Reasoning model that thinks before it answers.',
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
    id: 'qrouter-llama-3.1-8b',
    family: 'Llama 3.1 8B Instruct',
    vendor: 'meta',
    description: 'Small and fast, for simple, high-volume tasks.',
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

export function normalizeModelId(id: string): string {
  if (!id) return id;
  return id.replace(/^qseal-/, 'qrouter-');
}

/** Custom providers expose their own model ids through UPSTREAM_MODEL_MAP="qrouter-id=upstream-id,…". */
function customMap(): Record<string, string> {
  const raw = process.env.UPSTREAM_MODEL_MAP || '';
  return Object.fromEntries(
    raw.split(',').map((p) => p.split('=').map((s) => s.trim())).filter((p) => p.length === 2 && p[0] && p[1]),
  );
}

export function upstreamModelFor(id: string): string | undefined {
  const provider = config.upstreamProvider;
  if (!provider || !hasUpstream()) return config.allowDevBypass ? 'dev-engine' : undefined;
  const norm = normalizeModelId(id);
  if (provider === 'custom') return customMap()[norm] || customMap()[id];
  return CATALOGUE.find((m) => m.id === norm)?.upstream[provider];
}

/** The underlying model's name as served by the active provider. */
export function familyFor(m: CatalogueModel): string {
  const p = config.upstreamProvider;
  return (p && hasUpstream() && m.familyByProvider?.[p]) || m.family;
}

export function priceFor(id: string): number {
  const norm = normalizeModelId(id);
  const m = CATALOGUE.find((x) => x.id === norm);
  return +(config.pricePerRequestUsdc * (m?.priceFactor ?? 1)).toFixed(6);
}

/** Models that can actually be served right now. */
export function availableModels(): CatalogueModel[] {
  return CATALOGUE.filter((m) => upstreamModelFor(m.id) !== undefined);
}

export function isAvailable(id: string): boolean {
  const norm = normalizeModelId(id);
  return availableModels().some((m) => m.id === norm);
}
