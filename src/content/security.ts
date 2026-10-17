import type { Availability } from '@/components/ui/StatusTag'

/**
 * The security model, layer by layer, as implemented in backend/. Each layer
 * states what it covers and what it does not claim. Keep this in step with
 * the gateway code.
 */
export interface SecurityLayer {
  id: string
  name: string
  short: string
  covers: string
  notClaimed: string
  status: Availability
}

export const SECURITY_LAYERS: SecurityLayer[] = [
  {
    id: 'transport',
    name: 'Transport & data handling',
    short: 'Encrypted transport and zero prompt retention at the gateway.',
    covers:
      'Clients reach the gateway over HTTPS. The gateway keeps no prompts or completions: receipts hold SHA-256 hashes, and the access log records only method, path and status.',
    notClaimed:
      'That the model provider never sees your prompt. Requests are forwarded to the configured provider (for example Groq or OpenRouter) under that provider’s data policy.',
    status: 'available',
  },
  {
    id: 'pqc',
    name: 'Post-quantum cryptography',
    short: 'ML-KEM-768 sealing and ML-DSA-65 signatures (NIST FIPS 203 and 204).',
    covers:
      'Prompts can be sealed in the client with ML-KEM-768 and AES-256-GCM, so the request stays encrypted to the gateway even if TLS were recorded and later broken. Receipts are signed with ML-DSA-65.',
    notClaimed:
      'Post-quantum protection past the gateway. The gateway decrypts sealed prompts in memory, and its connection to the model provider uses that provider’s standard TLS.',
    status: 'available',
  },
  {
    id: 'execution',
    name: 'Inference execution',
    short: 'Routed to a named provider and model, never silently substituted.',
    covers:
      'Each QRouter model maps to a specific upstream model, and GET /v1/models shows which provider and model serve it. If the provider fails, the request fails and the charge is refunded.',
    notClaimed: 'Trusted execution environments (TEEs), remote attestation, or control over how the provider runs or stores requests.',
    status: 'available',
  },
  {
    id: 'receipts',
    name: 'Signed receipts & verification',
    short: 'A portable, checkable record of every completion.',
    covers:
      'Every completion returns a receipt signed with ML-DSA-65 and Ed25519 over the prompt and response hashes, model, token counts and payment. Anyone can check it against the keys at /.well-known/qseal-keys.json.',
    notClaimed: 'That a receipt proves an answer is correct, or any zero-knowledge proof of computation. It proves what the gateway recorded and signed.',
    status: 'available',
  },
  {
    id: 'wallet',
    name: 'Solana payments & access',
    short: 'x402 USDC payments and prepaid keys, kept separate from inference crypto.',
    covers:
      'Requests are paid in USDC on Solana through the x402 protocol, verified on-chain and usable once, or with a prepaid key bought the same way. Keys are stored only as hashes.',
    notClaimed:
      'Post-quantum security for payments. Solana wallets sign with Ed25519, a classical scheme: it protects your funds today, not the confidentiality of your inference.',
    status: 'available',
  },
]
