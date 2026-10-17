/**
 * The models QRouter offers, for pages that render without a gateway (the
 * marketing site). Mirrors backend/src/catalogue.ts; a unit test keeps the
 * two in sync. Prices are deployment-specific, so they only come from the
 * live API.
 */
export type ModelVendor = 'meta' | 'deepseek'

export interface CatalogueEntry {
  id: string
  family: string
  vendor: ModelVendor
  description: string
  contextWindow: number
  tags: string[]
}

export const VENDOR_NAME: Record<ModelVendor, string> = { meta: 'Meta', deepseek: 'DeepSeek' }

export const MODEL_CATALOGUE: CatalogueEntry[] = [
  {
    id: 'qrouter-quantum-70b',
    family: 'Llama 3.3 70B Instruct',
    vendor: 'meta',
    description: 'General-purpose 70B instruction model. Default.',
    contextWindow: 131072,
    tags: ['Default', 'General'],
  },
  {
    id: 'qrouter-llama-3.3-70b',
    family: 'Llama 3.3 70B Instruct',
    vendor: 'meta',
    description: 'Meta’s Llama 3.3 70B, addressed by its own name.',
    contextWindow: 131072,
    tags: ['General'],
  },
  {
    id: 'qrouter-deepseek-r1',
    family: 'DeepSeek R1',
    vendor: 'deepseek',
    description: 'Reasoning model that thinks before it answers.',
    contextWindow: 65536,
    tags: ['Reasoning'],
  },
  {
    id: 'qrouter-llama-3.1-8b',
    family: 'Llama 3.1 8B Instruct',
    vendor: 'meta',
    description: 'Small and fast, for simple, high-volume tasks.',
    contextWindow: 131072,
    tags: ['Fast'],
  },
]

export const formatContext = (n: number) => `${Math.round(n / 1024)}K context`
