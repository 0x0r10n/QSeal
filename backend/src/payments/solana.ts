import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { config } from '../config.js';

export interface PaymentVerificationResult {
  verified: boolean;
  type: 'x402-solana' | 'prepaid-key' | 'dev-bypass';
  signature?: string;
  reference?: string;
  amountUsdc: number;
  payer?: string;
  error?: string;
}

// In-memory anti-replay cache of spent transaction signatures and references
const spentSignatures = new Set<string>();
const spentReferences = new Set<string>();

export class SolanaVerifier {
  private connection: Connection;
  private payToAtaCache: string | null = null;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }

  /**
   * Get the expected Associated Token Account (ATA) for the payTo address
   */
  public getPayToAta(): string {
    if (this.payToAtaCache) return this.payToAtaCache;
    try {
      const payToPubkey = new PublicKey(config.payTo);
      const usdcMintPubkey = new PublicKey(config.usdcMint);
      const ata = getAssociatedTokenAddressSync(usdcMintPubkey, payToPubkey, true);
      this.payToAtaCache = ata.toBase58();
      return this.payToAtaCache;
    } catch {
      // If payTo is not a valid pubkey (e.g. demo placeholder), fallback to payTo
      this.payToAtaCache = config.payTo;
      return this.payToAtaCache;
    }
  }

  /**
   * Check if a reference or transaction signature was already spent
   */
  public isSpent(id: string): boolean {
    return spentSignatures.has(id) || spentReferences.has(id);
  }

  /**
   * Mark a reference or signature as spent (anti-replay)
   */
  public markSpent(signature?: string, reference?: string) {
    if (signature) spentSignatures.add(signature);
    if (reference) spentReferences.add(reference);
  }

  /**
   * Verify an on-chain Solana transaction or payment reference
   */
  public async verifyPayment(
    signature?: string,
    reference?: string,
    requiredAmountUsdc: number = config.pricePerRequestUsdc
  ): Promise<PaymentVerificationResult> {
    // 1. Anti-replay check
    if (signature && this.isSpent(signature)) {
      return {
        verified: false,
        type: 'x402-solana',
        amountUsdc: 0,
        error: 'Payment signature already spent (replay prevention)',
      };
    }
    if (reference && this.isSpent(reference)) {
      return {
        verified: false,
        type: 'x402-solana',
        amountUsdc: 0,
        error: 'Payment reference already spent (replay prevention)',
      };
    }

    // 2. Allow simulated dev payments if enabled and flagged with simulated signature
    if (
      config.allowDevBypass &&
      (signature?.startsWith('sim_tx_') || signature === 'dev-bypass-test-signature' || reference?.startsWith('ref_test_'))
    ) {
      this.markSpent(signature, reference);
      return {
        verified: true,
        type: 'dev-bypass',
        signature: signature || `sim_${Date.now()}`,
        reference,
        amountUsdc: requiredAmountUsdc,
        payer: 'DevWallet11111111111111111111111111111111111',
      };
    }

    if (!signature && !reference) {
      return {
        verified: false,
        type: 'x402-solana',
        amountUsdc: 0,
        error: 'Missing payment signature or reference',
      };
    }

    // 3. If reference provided without signature, lookup signatures for that reference key on Solana
    let txSig = signature;
    if (!txSig && reference) {
      try {
        const refPubkey = new PublicKey(reference);
        const sigInfos = await this.connection.getSignaturesForAddress(refPubkey, { limit: 1 });
        if (sigInfos.length === 0) {
          return {
            verified: false,
            type: 'x402-solana',
            reference,
            amountUsdc: 0,
            error: 'No confirmed Solana transaction found for reference',
          };
        }
        txSig = sigInfos[0].signature;
      } catch (err: any) {
        return {
          verified: false,
          type: 'x402-solana',
          reference,
          amountUsdc: 0,
          error: `Error checking reference on Solana: ${err?.message || err}`,
        };
      }
    }

    if (!txSig) {
      return {
        verified: false,
        type: 'x402-solana',
        amountUsdc: 0,
        error: 'No valid transaction signature found',
      };
    }

    // 4. Inspect the Solana transaction on-chain
    try {
      const tx = await this.connection.getParsedTransaction(txSig, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return {
          verified: false,
          type: 'x402-solana',
          signature: txSig,
          amountUsdc: 0,
          error: 'Transaction not found or not yet confirmed on Solana RPC',
        };
      }

      if (tx.meta?.err) {
        return {
          verified: false,
          type: 'x402-solana',
          signature: txSig,
          amountUsdc: 0,
          error: `Solana transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
        };
      }

      const payTo = config.payTo;
      const expectedAta = this.getPayToAta();
      let transferredUsdc = 0;
      let payerAddress = tx.transaction.message.accountKeys[0]?.pubkey?.toBase58();

      // Check SPL Token balances (postTokenBalances vs preTokenBalances)
      const postTokenBalances = tx.meta?.postTokenBalances || [];
      const preTokenBalances = tx.meta?.preTokenBalances || [];

      for (const post of postTokenBalances) {
        const accountKey = tx.transaction.message.accountKeys[post.accountIndex]?.pubkey?.toBase58();
        const matchesOwner = post.owner === payTo;
        const matchesAta = accountKey === expectedAta || accountKey === payTo;

        if ((matchesOwner || matchesAta) && post.mint === config.usdcMint) {
          const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
          const preAmount = pre?.uiTokenAmount?.uiAmount || 0;
          const postAmount = post.uiTokenAmount?.uiAmount || 0;
          const diff = postAmount - preAmount;
          if (diff > 0) {
            transferredUsdc += diff;
          }
        }
      }

      // Check direct parsed SPL instructions if token balance diff was 0
      if (transferredUsdc === 0) {
        const allInstructions = [
          ...tx.transaction.message.instructions,
          ...(tx.meta?.innerInstructions?.flatMap(i => i.instructions) || []),
        ];

        for (const inst of allInstructions) {
          if ('parsed' in inst && inst.parsed) {
            const type = inst.parsed.type;
            const info = inst.parsed.info;
            if (type === 'transfer' || type === 'transferChecked') {
              const dest = info.destination;
              if (dest === expectedAta || dest === payTo) {
                const amt = info.tokenAmount?.uiAmount ?? (info.amount ? Number(info.amount) / 1e6 : 0);
                if (amt > 0) {
                  transferredUsdc += amt;
                }
              }
            }
          }
        }
      }

      // Devnet fallback: Accept equivalent SOL transfer if testing on devnet without minted USDC
      if (transferredUsdc === 0 && config.solanaNetwork === 'devnet' && tx.meta?.postBalances && tx.meta?.preBalances) {
        const payToIdx = tx.transaction.message.accountKeys.findIndex(
          k => k.pubkey.toBase58() === payTo
        );
        if (payToIdx >= 0) {
          const lamportDiff = tx.meta.postBalances[payToIdx] - tx.meta.preBalances[payToIdx];
          if (lamportDiff > 0) {
            // Equivalent value credited (at ~$150/SOL, 1000 lamports is plenty for $0.001)
            transferredUsdc = Math.max(requiredAmountUsdc, (lamportDiff / 1e9) * 150);
          }
        }
      }

      // Validate amount meets price requirement
      const minimumRequired = requiredAmountUsdc * 0.99; // small floating tolerance
      if (transferredUsdc >= minimumRequired || config.allowDevBypass) {
        this.markSpent(txSig, reference);
        return {
          verified: true,
          type: 'x402-solana',
          signature: txSig,
          reference,
          amountUsdc: transferredUsdc || requiredAmountUsdc,
          payer: payerAddress,
        };
      }

      return {
        verified: false,
        type: 'x402-solana',
        signature: txSig,
        amountUsdc: transferredUsdc,
        error: `Insufficient payment: transferred ${transferredUsdc} USDC, required ${requiredAmountUsdc} USDC to payTo ATA (${expectedAta})`,
      };
    } catch (err: any) {
      return {
        verified: false,
        type: 'x402-solana',
        signature: txSig,
        amountUsdc: 0,
        error: `Solana verification exception: ${err?.message || err}`,
      };
    }
  }
}

export const solanaVerifier = new SolanaVerifier();
