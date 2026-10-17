import type { AccordionItem } from '@/components/ui/Accordion'
import { AvailabilityTag } from '@/components/ui/StatusTag'

export const FAQ: AccordionItem[] = [
  {
    q: 'What is QSeal, in one sentence?',
    meta: <AvailabilityTag value="available" />,
    a: 'An OpenAI-compatible AI inference gateway, paid in USDC on Solana, that can seal your prompt with post-quantum encryption and returns a post-quantum signed receipt with every answer.',
  },
  {
    q: 'Who can see my prompt?',
    meta: <AvailabilityTag value="available" />,
    a: 'The QSeal gateway decrypts it in memory to run the request and does not store or log it. It then forwards the prompt to the model provider serving your chosen model, which handles it under its own data policy. The Models page shows which provider that is. QSeal does not claim end-to-end encryption to the model or trusted execution.',
  },
  {
    q: 'What does “post-quantum” cover, exactly?',
    meta: <AvailabilityTag value="available" />,
    a: 'Two things. Prompt sealing uses ML-KEM-768 (NIST FIPS 203) with AES-256-GCM between your client and the gateway. Receipts are signed with ML-DSA-65 (FIPS 204) alongside Ed25519. Solana payment signatures are classical and are not part of that guarantee.',
  },
  {
    q: 'What does a signed receipt prove?',
    meta: <AvailabilityTag value="available" />,
    a: 'That this gateway processed a request with these prompt and response hashes, on this model, at this time, for this payment, and that none of it has been changed since. Check it in the app, with POST /v1/receipts/verify, or offline against the published keys. It does not prove that an answer is correct.',
  },
  {
    q: 'Which models are supported?',
    meta: <AvailabilityTag value="deployment" />,
    a: 'Whatever the gateway lists at GET /v1/models, with the price per request and the provider behind each one. The list depends on the provider a deployment has configured; the app always shows it live.',
  },
  {
    q: 'How do I pay?',
    meta: <AvailabilityTag value="available" />,
    a: 'In USDC on Solana, two ways. Pay per request from your wallet using the x402 protocol, or buy a prepaid key once and spend it down without approving each call. Agents usually use a prepaid key. If a request fails, you are not charged.',
  },
  {
    q: 'Do I need an account?',
    meta: <AvailabilityTag value="available" />,
    a: 'No. Your wallet and your prepaid keys are your identity. The app keeps your request history only in your browser, because the gateway keeps none.',
  },
  {
    q: 'How do I get started?',
    a: 'Open the app, connect a Solana wallet, and either buy a prepaid key or pay per request. Developers can point the OpenAI SDK at the QSeal base URL with a prepaid key as the API key. Agents can also use the MCP endpoint.',
  },
]
