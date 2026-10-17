import { getDb } from '../store/db.js';

export class FreeTrialManager {
  public static MAX_TRIALS = 3;

  /**
   * Check the trial status for a given wallet address or identifier.
   */
  public static getTrial(identifier: string): { remaining: number; used: number; total: number } {
    if (!identifier) return { remaining: this.MAX_TRIALS, used: 0, total: this.MAX_TRIALS };
    const id = identifier.trim().toLowerCase();
    try {
      const db = getDb();
      const row = db.prepare('SELECT used_count, max_trials FROM free_trials WHERE identifier = ?').get(id) as
        | { used_count: number; max_trials: number }
        | undefined;

      if (!row) {
        return { remaining: this.MAX_TRIALS, used: 0, total: this.MAX_TRIALS };
      }
      const remaining = Math.max(0, row.max_trials - row.used_count);
      return { remaining, used: row.used_count, total: row.max_trials };
    } catch {
      return { remaining: this.MAX_TRIALS, used: 0, total: this.MAX_TRIALS };
    }
  }

  /**
   * Deduct 1 trial request for the given wallet address or identifier.
   */
  public static consume(identifier: string): { success: boolean; remaining: number; error?: string } {
    if (!identifier) return { success: false, remaining: 0, error: 'Missing wallet identifier' };
    const id = identifier.trim().toLowerCase();
    const db = getDb();
    const now = new Date().toISOString();

    const row = db.prepare('SELECT used_count, max_trials FROM free_trials WHERE identifier = ?').get(id) as
      | { used_count: number; max_trials: number }
      | undefined;

    if (!row) {
      db.prepare(`
        INSERT INTO free_trials (identifier, used_count, max_trials, created_at, last_used_at)
        VALUES (?, 1, ?, ?, ?)
      `).run(id, this.MAX_TRIALS, now, now);
      return { success: true, remaining: this.MAX_TRIALS - 1 };
    }

    if (row.used_count >= row.max_trials) {
      return {
        success: false,
        remaining: 0,
        error: `Free trial limit reached (${row.max_trials}/${row.max_trials} used). Connect your wallet or prepaid key to continue.`,
      };
    }

    const nextUsed = row.used_count + 1;
    db.prepare(`
      UPDATE free_trials SET used_count = ?, last_used_at = ? WHERE identifier = ?
    `).run(nextUsed, now, id);

    return { success: true, remaining: Math.max(0, row.max_trials - nextUsed) };
  }
}
