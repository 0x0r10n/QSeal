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
  for (let attempt = 0; ; attempt++) {
    onStage?.('preparing')
    const prepared = await preparePayment(payer, purpose)
    onStage?.('signing')
    try {
      const signature = await signAndSend(prepared.transaction, prepared.wallet_chain)
      onStage?.('confirming')
      return { signature, reference: prepared.reference, amountUsdc: prepared.amount_usdc }
    } catch (err) {
      // A slow approval can outlive the transaction's blockhash; the wallet then refuses to send it,
      // so nothing was paid. Build a fresh one and ask once more.
      if (!EXPIRED.test(String((err as Error)?.message ?? err))) throw err
      if (attempt > 0) throw new Error('The transaction expired before it was approved. Please try again.')
    }
  }
}

// Wallet error wording is not documented (unconfirmed); these cover Solana web3.js and the common RPC messages.
const EXPIRED = /blockhash not found|block ?height ?exceeded|transaction.*expired/i
