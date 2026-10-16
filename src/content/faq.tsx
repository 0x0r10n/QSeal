import type { AccordionItem } from '@/components/ui/Accordion'
import { AvailabilityTag } from '@/components/ui/StatusTag'

export const FAQ: AccordionItem[] = [
  {
    q: 'What is QSeal, in one sentence?',
    meta: <AvailabilityTag value="available" />,
    a: 'QSeal is an AI inference API for developers and agents that pairs each completion with a signed receipt and is built around post-quantum cryptography.',
  },
  {
    q: 'Is my prompt end-to-end encrypted or hidden from the operator?',
    meta: <AvailabilityTag value="deployment" />,
    a: 'Not by default. Traffic is encrypted in transit, but this site does not claim end-to-end encryption to the model, trusted execution, or that prompts are invisible to the operator. Any such guarantee will be documented explicitly for the deployment that provides it.',
  },
  {
    q: 'What does “post-quantum” cover, exactly?',
    meta: <AvailabilityTag value="deployment" />,
    a: 'It refers to QSeal’s choice of cryptographic primitives that are designed to resist attacks by future quantum computers. The specific algorithms and where they are applied are listed in the API reference. Solana wallet signatures are classical and are not part of that guarantee.',
  },
  {
    q: 'What does a signed receipt prove?',
    meta: <AvailabilityTag value="available" />,
    a: 'A receipt is a signed record of an inference that you can store and check later against QSeal’s published key. It does not prove that an answer is correct, and it is not a zero-knowledge proof.',
  },
  {
    q: 'Which models are supported?',
    meta: <AvailabilityTag value="deployment" />,
    a: 'Whatever the connected backend returns from GET /v1/models. The app reads that list live; this site never shows a hard-coded catalogue.',
  },
  {
    q: 'How do I pay?',
    meta: <AvailabilityTag value="available" />,
    a: 'With a Solana wallet, or with a prepaid key that lets you call the API without signing a transaction for every request. Wallet connection in this web app is enabled once the deployment’s wallet and payment configuration is supplied.',
  },
  {
    q: 'How do I get started?',
    a: 'Open the app, pick a model, and send a request. If you are integrating programmatically, point any OpenAI-compatible client at your QSeal base URL and follow the documentation.',
  },
]
