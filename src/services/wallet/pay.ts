import { preparePayment } from '../api/gateway'
import { signAndSend } from './wallet'

export type PayStage = 'preparing' | 'signing' | 'confirming'

/**
 * Pay the gateway in USDC from the connected wallet. The gateway prepares
 * the transfer, the wallet signs and sends it, and the returned signature is
 * the payment proof (x402 PAYMENT-SIGNATURE or a prepaid deposit).
 */
export async function payFromWallet(
  payer: string,
  purpose: { kind: 'request'; model: string } | { kind: 'deposit'; amountUsdc: number },
  onStage?: (s: PayStage) => void,
): Promise<{ signature: string; reference: string; amountUsdc: number }> {
  onStage?.('preparing')
  const prepared = await preparePayment(payer, purpose)
  onStage?.('signing')
  const signature = await signAndSend(prepared.transaction, prepared.wallet_chain)
  onStage?.('confirming')
  return { signature, reference: prepared.reference, amountUsdc: prepared.amount_usdc }
}
