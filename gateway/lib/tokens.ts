/**
 * Lightweight token estimation.
 * Uses the ~4 chars/token heuristic for English text.
 * Good enough for usage tracking and billing estimates.
 */

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
