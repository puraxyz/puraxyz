import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "pura-gateway",
    version: "0.1.0",
    chain: process.env.CHAIN_ID ?? "84532",
    timestamp: new Date().toISOString(),
  });
}
