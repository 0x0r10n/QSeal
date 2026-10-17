import { Connection, PublicKey, Transaction, Keypair, type ParsedTransactionWithMeta } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { config } from '../config.js';
import { getDb, toMicro } from '../store/db.js';

export interface PaymentVerificationResult {
  verified: boolean;
  type: 'x402-solana' | 'prepaid-key' | 'dev-bypass';
  signature?: string;
  reference?: string;
  amountUsdc: number;
  payer?: string;
  error?: string;
  /** Undo the charge when the paid-for work fails (refund a key, or release a claimed tx). */
  refund?: () => void;
}

const USDC_DECIMALS = 6;
const CONFIRM_WAIT_MS = 20_000;
const CONFIRM_POLL_MS = 1_500;

export class SolanaVerifier {
  private connection: Connection;
  private payToAtaCache: string | null = null;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
  }

  /** The USDC Associated Token Account (ATA) owned by the payTo wallet. */
  public getPayToAta(): string {
    if (this.payToAtaCache) return this.payToAtaCache;
    try {
      const ata = getAssociatedTokenAddressSync(new PublicKey(config.usdcMint), new PublicKey(config.payTo), true);
      this.payToAtaCache = ata.toBase58();
    } catch {
      // payTo is not a valid public key (dev placeholder)
      this.payToAtaCache = config.payTo;
    }
    return this.payToAtaCache;
  }

  /**
   * Atomically claim a payment proof so it can be used once. Returns false if
   * it was already claimed (replay). Claims are durable across restarts.
   */
  public claim(id: string, kind: 'signature' | 'reference'): boolean {
    const r = getDb()
      .prepare('INSERT OR IGNORE INTO spent_payments (id, kind, created_at) VALUES (?, ?, ?)')
      .run(id, kind, new Date().toISOString());
    return Number(r.changes) === 1;
  }

  public release(...ids: Array<string | undefined>) {
    const stmt = getDb().prepare('DELETE FROM spent_payments WHERE id = ?');
    for (const id of ids) if (id) stmt.run(id);
  }

  public isSpent(id: string): boolean {
    return Boolean(getDb().prepare('SELECT 1 FROM spent_payments WHERE id = ?').get(id));
  }

  /**
   * Build an unsigned USDC transfer from `payer` to the treasury, tagged with
   * a fresh reference key (Solana Pay style). The wallet signs and sends it.
   */
  public async buildTransfer(payer: string, amountUsdc: number): Promise<{ transaction: string; reference: string }> {
    const payerKey = new PublicKey(payer);
    const mint = new PublicKey(config.usdcMint);
    const treasury = new PublicKey(config.payTo);
    const sourceAta = getAssociatedTokenAddressSync(mint, payerKey, true);
    const destAta = getAssociatedTokenAddressSync(mint, treasury, true);
    const reference = Keypair.generate().publicKey;

    const transfer = createTransferCheckedInstruction(
      sourceAta,
      mint,
      destAta,
      payerKey,
      BigInt(toMicro(amountUsdc)),
      USDC_DECIMALS,
    );
    // Reference key lets the gateway find this transaction by reference.
    transfer.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({ feePayer: payerKey, recentBlockhash: blockhash });
    // Idempotent: costs nothing extra when the treasury account already exists.
    tx.add(createAssociatedTokenAccountIdempotentInstruction(payerKey, destAta, treasury, mint));
    tx.add(transfer);

    const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return { transaction: Buffer.from(bytes).toString('base64'), reference: reference.toBase58() };
  }

  private async fetchConfirmed(signature: string): Promise<ParsedTransactionWithMeta | null> {
    const deadline = Date.now() + CONFIRM_WAIT_MS;
    for (;;) {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });
      if (tx || Date.now() > deadline) return tx;
      await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS));
    }
  }

  /**
   * Verify an on-chain USDC payment to the treasury of at least
   * `requiredAmountUsdc`. On success the proof is consumed; the returned
   * `refund` releases it again if the paid-for work fails.
   */
  public async verifyPayment(
    signature?: string,
    reference?: string,
    requiredAmountUsdc: number = config.pricePerRequestUsdc,
  ): Promise<PaymentVerificationResult> {
    const fail = (error: string, extra: Partial<PaymentVerificationResult> = {}): PaymentVerificationResult => ({
      verified: false,
      type: 'x402-solana',
      amountUsdc: 0,
      error,
      ...extra,
    });

    if (!signature && !reference) return fail('Missing payment signature or reference');

    // Simulated payments exist for local development only.
    const simulated = signature?.startsWith('sim_tx_') || reference?.startsWith('ref_test_');
    if (simulated) {
      if (!config.allowDevBypass) return fail('Simulated payments are disabled');
      if (signature && !this.claim(signature, 'signature')) return fail('Payment signature already spent (replay prevention)');
      return {
        verified: true,
        type: 'dev-bypass',
        signature,
        reference,
        amountUsdc: requiredAmountUsdc,
        payer: 'DevWallet',
        refund: () => this.release(signature),
      };
    }

    // Resolve the transaction from its reference key when no signature was given.
    let txSig = signature;
    if (!txSig && reference) {
      try {
        const sigInfos = await this.connection.getSignaturesForAddress(new PublicKey(reference), { limit: 1 });
        if (sigInfos.length === 0) return fail('No confirmed Solana transaction found for reference', { reference });
        txSig = sigInfos[0].signature;
      } catch (err: any) {
        return fail(`Error checking reference on Solana: ${err?.message || err}`, { reference });
      }
    }
    if (!txSig) return fail('No valid transaction signature found');

    // Claim before the RPC round trip so concurrent requests cannot reuse it.
    if (!this.claim(txSig, 'signature')) return fail('Payment signature already spent (replay prevention)');
    if (reference && !this.claim(reference, 'reference')) {
      this.release(txSig);
      return fail('Payment reference already spent (replay prevention)');
    }
    const releaseAll = () => this.release(txSig, reference);

    try {
      const tx = await this.fetchConfirmed(txSig);
      if (!tx) {
        releaseAll();
        return fail('Transaction not found or not yet confirmed on Solana. Retry in a few seconds.', { signature: txSig });
      }
      if (tx.meta?.err) {
        releaseAll();
        return fail(`Solana transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`, { signature: txSig });
      }
      if (tx.blockTime && Date.now() / 1000 - tx.blockTime > config.maxPaymentAgeSec) {
        // Leave it claimed: an expired payment should never become usable.
        return fail(`Payment is older than ${config.maxPaymentAgeSec} seconds`, { signature: txSig });
      }

      const transferredUsdc = this.creditedUsdc(tx);
      const payer = tx.transaction.message.accountKeys[0]?.pubkey?.toBase58();

      if (transferredUsdc + 1e-9 >= requiredAmountUsdc) {
        return {
          verified: true,
          type: 'x402-solana',
          signature: txSig,
          reference,
          amountUsdc: transferredUsdc,
          payer,
          refund: releaseAll,
        };
      }

      releaseAll();
      return fail(
        `Insufficient payment: transferred ${transferredUsdc} USDC, required ${requiredAmountUsdc} USDC to ${this.getPayToAta()}`,
        { signature: txSig, amountUsdc: transferredUsdc },
      );
    } catch (err: any) {
      releaseAll();
      return fail(`Solana verification error: ${err?.message || err}`, { signature: txSig });
    }
  }

  /** USDC credited to the treasury by this transaction. */
  private creditedUsdc(tx: ParsedTransactionWithMeta): number {
    const payTo = config.payTo;
    const expectedAta = this.getPayToAta();
    const keys = tx.transaction.message.accountKeys;
    let micro = 0;

    const pre = tx.meta?.preTokenBalances || [];
    for (const post of tx.meta?.postTokenBalances || []) {
      if (post.mint !== config.usdcMint) continue;
      const account = keys[post.accountIndex]?.pubkey?.toBase58();
      if (post.owner !== payTo && account !== expectedAta) continue;
      const before = BigInt(pre.find((p) => p.accountIndex === post.accountIndex)?.uiTokenAmount?.amount || '0');
      const after = BigInt(post.uiTokenAmount?.amount || '0');
      if (after > before) micro += Number(after - before);
    }
    if (micro > 0) return micro / 1e6;

    // Devnet only: accept an equivalent SOL transfer for testing without devnet USDC.
    if (config.solanaNetwork === 'devnet' && tx.meta?.postBalances && tx.meta?.preBalances) {
      const idx = keys.findIndex((k) => k.pubkey.toBase58() === payTo);
      if (idx >= 0) {
        const lamports = tx.meta.postBalances[idx] - tx.meta.preBalances[idx];
        if (lamports > 0) return (lamports / 1e9) * 150;
      }
    }
    return 0;
  }
}

export const solanaVerifier = new SolanaVerifier();
