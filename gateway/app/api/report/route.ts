import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getDailyReport } from "@/lib/budget";
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
 * Returns: total spend, per-model breakdown, request count, average cost.
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

  return NextResponse.json(
    {
      period: "24h",
      windowStart: new Date(report.windowStart).toISOString(),
      totalSpendUsd: Number(report.spentUsd.toFixed(6)),
      requestCount: report.requestCount,
      averageCostUsd: Number(avgCost.toFixed(6)),
      perModel: report.perModel,
    },
    { headers: CORS_HEADERS },
  );
}
