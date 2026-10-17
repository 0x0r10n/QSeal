import crypto from 'crypto';
import { config } from '../config.js';

export interface PrepaidKeyRecord {
  apiKey: string;
  walletAddress: string;
  balanceUsdc: number;
  totalSpentUsdc: number;
  totalRequests: number;
  createdAt: string;
  lastUsedAt: string;
}

// In-memory key store (can be persisted to SQLite or Redis in production)
const keyStore = new Map<string, PrepaidKeyRecord>();

// Pre-seed a demo developer test key if bypass enabled
if (config.allowDevBypass) {
  const demoKey = 'qseal_sk_demo_developer_test_key_0000000000';
  keyStore.set(demoKey, {
    apiKey: demoKey,
    walletAddress: 'DemoSolanaWallet11111111111111111111111111',
    balanceUsdc: 10.0, // 10,000 requests
    totalSpentUsdc: 0.0,
    totalRequests: 0,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  });
}

export class PrepaidKeyManager {
  /**
   * Create a new prepaid API key for a Solana wallet
   */
  public static createKey(walletAddress: string, initialDepositUsdc: number = 1.0): PrepaidKeyRecord {
    const rawBytes = crypto.randomBytes(24).toString('hex');
    const apiKey = `qseal_sk_${rawBytes}`;
    const now = new Date().toISOString();

    const record: PrepaidKeyRecord = {
      apiKey,
      walletAddress,
      balanceUsdc: initialDepositUsdc,
      totalSpentUsdc: 0.0,
      totalRequests: 0,
      createdAt: now,
      lastUsedAt: now,
    };

    keyStore.set(apiKey, record);
    return record;
  }

  /**
   * Retrieve key record
   */
  public static getKey(apiKey: string): PrepaidKeyRecord | undefined {
    return keyStore.get(apiKey);
  }

  /**
   * Check and deduct cost from prepaid balance
   */
  public static deduct(
    apiKey: string,
    amountUsdc: number = config.pricePerRequestUsdc
  ): { success: boolean; remainingBalance: number; error?: string } {
    const record = keyStore.get(apiKey);
    if (!record) {
      return { success: false, remainingBalance: 0, error: 'Invalid API key' };
    }

    if (record.balanceUsdc < amountUsdc) {
      return {
        success: false,
        remainingBalance: record.balanceUsdc,
        error: `Insufficient balance: ${record.balanceUsdc.toFixed(4)} USDC. Required: ${amountUsdc.toFixed(4)} USDC`,
      };
    }

    record.balanceUsdc -= amountUsdc;
    record.totalSpentUsdc += amountUsdc;
    record.totalRequests += 1;
    record.lastUsedAt = new Date().toISOString();

    return { success: true, remainingBalance: record.balanceUsdc };
  }

  /**
   * Add balance to existing key
   */
  public static deposit(apiKey: string, amountUsdc: number): boolean {
    const record = keyStore.get(apiKey);
    if (!record) return false;
    record.balanceUsdc += amountUsdc;
    return true;
  }
}
