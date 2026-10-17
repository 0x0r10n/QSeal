/**
 * Types for the QSeal gateway contracts (see backend/src/routes). Only the
 * fields this UI reads are typed; responses are kept in `raw` where useful.
 */
export interface ModelInfo {
  id: string
  ownedBy?: string
  created?: number
  description?: string
  priceUsdc?: number
  contextWindow?: number
  servedBy?: { provider?: string; upstreamModel?: string }
  raw: unknown
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

/** How a request is paid for. */
export type Payment =
  | { kind: 'key' } // prepaid key from the session (Authorization: Bearer)
  | { kind: 'x402'; signature: string; reference?: string } // on-chain USDC transfer

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  payment: Payment
  /** Encrypt the request to the gateway's ML-KEM-768 key and ask for a sealed response. */
  seal?: boolean
  /** Free-form extra fields supplied by the user in Advanced settings. */
  extra?: Record<string, unknown>
}

export interface ChatCompletionResult {
  /** Assistant text if the response matched the expected shape. */
  text: string | null
  id?: string
  model?: string
  status: number
  headers: Record<string, string>
  raw: unknown
  receipt: QSealReceipt | null
  sealed: boolean
  latencyMs: number
}

export interface QSealReceipt {
  id: string
  version: '1.0' | '2'
  timestamp: string
  model: string
  promptHash: string
  responseHash: string
  tokens: { promptTokens: number; completionTokens: number; totalTokens: number }
  payment: { type: 'x402-solana' | 'prepaid-key' | 'dev-bypass'; reference?: string; signature?: string; amountUsdc: number }
  sealed: boolean
  pqc: {
    algorithm: string
    mlDsaPublicKey: string
    ed25519PublicKey: string
    mlDsaSignature: string
    ed25519Signature: string
  }
}

export interface Health {
  status: string
  version: string
  mode: 'development' | 'production'
  solana: {
    network: 'devnet' | 'mainnet-beta'
    caip2: string
    wallet_chain: 'solana:mainnet' | 'solana:devnet'
    payTo: string
    payToAta: string
    usdc_mint: string
    price_per_request_usdc: number
    min_prepaid_deposit_usdc: number
  }
  upstream: { provider: string; active: boolean }
}

export interface GatewayKeys {
  algorithm: string
  mlKemPublicKey: string
  mlDsaPublicKey: string
  ed25519PublicKey: string
  generatedAt: string
}

export interface KeyBalance {
  wallet_address: string
  balance_usdc: number
  total_spent_usdc: number
  total_requests: number
  estimated_requests_remaining: number
  created_at: string
  last_used_at: string
}

export interface X402Challenge {
  x402Version: 2
  accepts: Array<{
    scheme: 'exact'
    price: string
    network: string
    payTo: string
    asset: string
    extra?: { reference: string; payToAta: string; amountNumeric: number; solanaPayUrl: string; expiresAt: number }
  }>
}

export interface PreparedPayment {
  transaction: string
  reference: string
  amount_usdc: number
  network: string
  wallet_chain: 'solana:mainnet' | 'solana:devnet'
  pay_to: string
}
