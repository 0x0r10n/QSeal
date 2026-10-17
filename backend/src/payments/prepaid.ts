import crypto from 'crypto';
import { getDb, toMicro, fromMicro } from '../store/db.js';

export interface PrepaidKeyRecord {
  keyPrefix: string;
  walletAddress: string;
  balanceUsdc: number;
  totalSpentUsdc: number;
  totalRequests: number;
  createdAt: string;
  lastUsedAt: string;
}

interface Row {
  key_prefix: string;
  wallet: string;
  balance_micro: number;
  spent_micro: number;
  requests: number;
  created_at: string;
  last_used_at: string;
}

/** Keys are stored only as SHA-256 hashes; the plaintext is shown to the buyer once. */
const hashKey = (apiKey: string) => crypto.createHash('sha256').update(apiKey).digest('hex');

const toRecord = (r: Row): PrepaidKeyRecord => ({
  keyPrefix: r.key_prefix,
  walletAddress: r.wallet,
  balanceUsdc: fromMicro(r.balance_micro),
  totalSpentUsdc: fromMicro(r.spent_micro),
  totalRequests: r.requests,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
});

export const isPrepaidKey = (token: string) => /^qseal_sk_[a-f0-9]{48}$/.test(token);

export class PrepaidKeyManager {
  /** Create a funded key. Callers must have verified the deposit first. */
  public static createKey(walletAddress: string, depositUsdc: number): { apiKey: string; record: PrepaidKeyRecord } {
    const apiKey = `qseal_sk_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO prepaid_keys (key_hash, key_prefix, wallet, balance_micro, created_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(hashKey(apiKey), apiKey.slice(0, 14), walletAddress, toMicro(depositUsdc), now, now);
    return { apiKey, record: this.getKey(apiKey)! };
  }

  public static getKey(apiKey: string): PrepaidKeyRecord | undefined {
    const row = getDb().prepare('SELECT * FROM prepaid_keys WHERE key_hash = ?').get(hashKey(apiKey)) as Row | undefined;
    return row ? toRecord(row) : undefined;
  }

  /** Atomically deduct; fails without side effects when the balance is too low. */
  public static deduct(apiKey: string, amountUsdc: number): { success: boolean; remainingBalance: number; error?: string } {
    const micro = toMicro(amountUsdc);
    const result = getDb()
      .prepare(
        `UPDATE prepaid_keys
            SET balance_micro = balance_micro - ?, spent_micro = spent_micro + ?, requests = requests + 1, last_used_at = ?
          WHERE key_hash = ? AND balance_micro >= ?`,
      )
      .run(micro, micro, new Date().toISOString(), hashKey(apiKey), micro);
    const record = this.getKey(apiKey);
    if (Number(result.changes) === 1) return { success: true, remainingBalance: record!.balanceUsdc };
    if (!record) return { success: false, remainingBalance: 0, error: 'Invalid API key' };
    return {
      success: false,
      remainingBalance: record.balanceUsdc,
      error: `Insufficient balance: ${record.balanceUsdc.toFixed(4)} USDC. Required: ${amountUsdc.toFixed(4)} USDC`,
    };
  }

  /** Reverse a deduction when the request it paid for failed. */
  public static refund(apiKey: string, amountUsdc: number): void {
    const micro = toMicro(amountUsdc);
    getDb()
      .prepare(
        `UPDATE prepaid_keys
            SET balance_micro = balance_micro + ?, spent_micro = MAX(0, spent_micro - ?), requests = MAX(0, requests - 1)
          WHERE key_hash = ?`,
      )
      .run(micro, micro, hashKey(apiKey));
  }

  public static deposit(apiKey: string, amountUsdc: number): boolean {
    const result = getDb()
      .prepare('UPDATE prepaid_keys SET balance_micro = balance_micro + ? WHERE key_hash = ?')
      .run(toMicro(amountUsdc), hashKey(apiKey));
    return Number(result.changes) === 1;
  }
}
