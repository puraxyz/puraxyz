import { NextResponse } from "next/server";
import { getMarketplaceStats } from "@/lib/marketplace";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** GET /api/economy — public marketplace aggregate data */
export async function GET() {
  const stats = getMarketplaceStats();
  return NextResponse.json(stats, { headers: CORS_HEADERS });
}
