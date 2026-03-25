import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getDailyReport } from "@/lib/budget";
import { getQualityScore } from "@/lib/quality";
import { createHash } from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/report — overnight cost report for the authenticated key.
 * Returns: total spend, per-model breakdown, request count, average cost,
 * quality scores, earnings (from marketplace), and net income.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = request.headers.get("authorization")!.slice(7);
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const report = await getDailyReport(keyHash);

  const avgCost = report.requestCount > 0 ? report.spentUsd / report.requestCount : 0;

  const providers = ["openai", "anthropic", "groq", "gemini"];
  const qualityScores: Record<string, number> = {};
  for (const p of providers) {
    qualityScores[p] = getQualityScore(p);
  }

  // Marketplace earnings (populated once marketplace is active)
  const earningsSats = 0;
  const SATS_PER_USD = 2500;
  const spendSats = Math.ceil(report.spentUsd * SATS_PER_USD);
  const netIncomeSats = earningsSats - spendSats;

  return NextResponse.json(
    {
      period: "24h",
      windowStart: new Date(report.windowStart).toISOString(),
      totalSpendUsd: Number(report.spentUsd.toFixed(6)),
      requestCount: report.requestCount,
      averageCostUsd: Number(avgCost.toFixed(6)),
      perModel: report.perModel,
      qualityScores,
      earningsSats,
      spendSats,
      netIncomeSats,
      networkRank: null,
    },
    { headers: CORS_HEADERS },
  );
}
