import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/metrics";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/status — real-time provider availability and latency.
 * Data source: the gateway itself. Every routed request feeds these counters.
 */
export async function GET() {
  const providers = getProviderStatuses();
  const allAvailable = providers.every((p) => p.available);

  return NextResponse.json(
    {
      status: allAvailable ? "operational" : "degraded",
      timestamp: new Date().toISOString(),
      providers,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=10" } },
  );
}
