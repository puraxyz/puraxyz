/**
 * Income tracker — monitors zap receipts, maintains running tally,
 * generates daily income statements.
 *
 * The OpenClaw skill uses this to report daily earnings to the operator.
 * Mirrors the gateway's /api/income endpoint concept.
 */

export interface IncomeEntry {
  timestamp: number;
  eventId: string;
  amountMsats: number;
  direction: 'in' | 'out';
  memo: string;
}

export interface IncomeSummary {
  periodStart: number;
  periodEnd: number;
  totalEarnedMsats: number;
  totalSpentMsats: number;
  netMsats: number;
  jobsCompleted: number;
  jobsRequested: number;
  entries: IncomeEntry[];
}

export class IncomeTracker {
  private entries: IncomeEntry[] = [];

  recordEarning(eventId: string, amountMsats: number, memo = ''): void {
    this.entries.push({
      timestamp: Math.floor(Date.now() / 1000),
      eventId,
      amountMsats,
      direction: 'in',
      memo,
    });
  }

  recordSpending(eventId: string, amountMsats: number, memo = ''): void {
    this.entries.push({
      timestamp: Math.floor(Date.now() / 1000),
      eventId,
      amountMsats,
      direction: 'out',
      memo,
    });
  }

  /** Get summary for a time period (default: last 24 hours). */
  summary(periodSeconds = 86400): IncomeSummary {
    const now = Math.floor(Date.now() / 1000);
    const start = now - periodSeconds;
    const recent = this.entries.filter((e) => e.timestamp >= start);

    const earned = recent.filter((e) => e.direction === 'in');
    const spent = recent.filter((e) => e.direction === 'out');

    const totalEarned = earned.reduce((s, e) => s + e.amountMsats, 0);
    const totalSpent = spent.reduce((s, e) => s + e.amountMsats, 0);

    return {
      periodStart: start,
      periodEnd: now,
      totalEarnedMsats: totalEarned,
      totalSpentMsats: totalSpent,
      netMsats: totalEarned - totalSpent,
      jobsCompleted: earned.length,
      jobsRequested: spent.length,
      entries: recent,
    };
  }

  /** Format summary as a human-readable string (for Telegram reports). */
  formatSummary(periodSeconds = 86400): string {
    const s = this.summary(periodSeconds);
    const lines = [
      `Income Statement (${new Date(s.periodStart * 1000).toISOString().slice(0, 10)})`,
      `───────────────────────────`,
      `Earned:    ${(s.totalEarnedMsats / 1000).toFixed(0)} sats (${s.jobsCompleted} jobs)`,
      `Spent:     ${(s.totalSpentMsats / 1000).toFixed(0)} sats (${s.jobsRequested} requests)`,
      `Net:       ${(s.netMsats / 1000).toFixed(0)} sats`,
    ];
    return lines.join('\n');
  }

  /** Get all entries (for persistence). */
  allEntries(): IncomeEntry[] {
    return [...this.entries];
  }

  /** Load entries from persistence. */
  load(entries: IncomeEntry[]): void {
    this.entries = [...entries];
  }
}
