import type { ChatMessage } from "./providers";

export type ComplexityTier = "cheap" | "mid" | "premium";

const CODE_BLOCK_RE = /```[\s\S]*?```/;
const REASONING_PHRASES = [
  "step by step",
  "think through",
  "analyze",
  "compare and contrast",
  "explain why",
  "prove that",
  "derive",
  "what are the tradeoffs",
  "debug this",
  "review this code",
];

/**
 * Score task complexity from messages to route cheap tasks to cheap models
 * and complex tasks to premium models.
 *
 * Heuristic — not meant to be perfect. Three tiers:
 * - cheap: short Q&A, simple lookups, greetings (<200 chars, no code, no reasoning)
 * - mid: moderate tasks (200-1500 chars or code present)
 * - premium: long context, reasoning triggers, system prompts >500 chars
 */
export function scoreComplexity(messages: ChatMessage[]): ComplexityTier {
  const totalContent = messages.map((m) => m.content).join("\n");
  const len = totalContent.length;
  const systemMsg = messages.find((m) => m.role === "system");
  const userMsgs = messages.filter((m) => m.role === "user");
  const lastUser = userMsgs[userMsgs.length - 1]?.content.toLowerCase() ?? "";

  // Premium signals
  if (systemMsg && systemMsg.content.length > 500) return "premium";
  if (len > 6000) return "premium";
  if (REASONING_PHRASES.some((p) => lastUser.includes(p))) return "premium";
  if (messages.length > 10) return "premium";

  // Cheap signals
  if (len < 200 && !CODE_BLOCK_RE.test(totalContent) && messages.length <= 3) return "cheap";

  // Everything else is mid
  return "mid";
}

/**
 * Map complexity tier to preferred model tier for routing.
 * Returns provider preference order.
 */
export function tierToProviders(tier: ComplexityTier): string[] {
  switch (tier) {
    case "cheap":
      return ["groq", "gemini", "openai"];
    case "mid":
      return ["openai", "gemini", "anthropic", "groq"];
    case "premium":
      return ["anthropic", "openai", "gemini"];
  }
}

const TIER_ORDER: ComplexityTier[] = ["cheap", "mid", "premium"];

/**
 * Shift a complexity tier up or down based on a quality preference.
 * "high" bumps up (cheap→mid, mid→premium, premium stays).
 * "low" pushes down (premium→mid, mid→cheap, cheap stays).
 * "balanced" or undefined returns the tier unchanged.
 */
export function adjustTier(tier: ComplexityTier, quality?: "low" | "balanced" | "high"): ComplexityTier {
  if (!quality || quality === "balanced") return tier;
  const idx = TIER_ORDER.indexOf(tier);
  if (quality === "high") return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
  return TIER_ORDER[Math.max(idx - 1, 0)];
}
