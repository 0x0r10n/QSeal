import type { Availability } from '@/components/ui/StatusTag'

/**
 * The security model, layer by layer. Each layer states what it covers and,
 * just as importantly, what it does not claim. Update `status` and copy only
 * when the backend's behaviour is confirmed.
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
    name: 'Transport & data protection',
    short: 'Encrypted transport between clients and the API.',
    covers:
      'Traffic between your client and the QSeal API travels over TLS. Logging, retention and storage policies are set by the operating deployment and documented alongside it.',
    notClaimed: 'End-to-end encryption of prompts all the way to the model, or that prompts are never visible to the operator.',
    status: 'deployment',
  },
  {
    id: 'pqc',
    name: 'Post-quantum cryptography',
    short: 'Primitives chosen to outlast large quantum computers.',
    covers:
      'QSeal’s cryptographic design targets NIST-standardised post-quantum algorithms for the records it issues, so their integrity is not tied to schemes that quantum computers are expected to break.',
    notClaimed: 'That every network hop is post-quantum today. Exact algorithms and parameters are listed in the API reference for each deployment.',
    status: 'deployment',
  },
  {
    id: 'execution',
    name: 'Inference execution',
    short: 'Where and how the model actually runs.',
    covers: 'Requests are executed on the model you select from the catalogue returned by the API, on QSeal-operated inference infrastructure.',
    notClaimed: 'Hardware-isolated trusted execution (TEEs) or remote attestation, unless your deployment documents them explicitly.',
    status: 'deployment',
  },
  {
    id: 'receipts',
    name: 'Signed receipts & verification',
    short: 'A portable record of each execution.',
    covers:
      'Inference can produce a signed receipt — a record you keep with the response and check later against QSeal’s published verification key.',
    notClaimed: 'That a receipt proves an answer is correct, or any zero-knowledge proof of computation.',
    status: 'available',
  },
  {
    id: 'wallet',
    name: 'Solana wallet authentication & payments',
    short: 'Identity and settlement, kept separate from inference crypto.',
    covers:
      'Solana wallets authenticate accounts and authorise payments. Prepaid keys provide access without signing a transaction for each request.',
    notClaimed:
      'Post-quantum security. Solana wallet signatures use Ed25519, a classical scheme — they secure payments, not the confidentiality of your inference.',
    status: 'available',
  },
]
