import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { generateIncomeStatement, formatIncomeText } from "@/lib/income";
import { createHash } from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/income — formatted income statement for the authenticated key.
 * Returns JSON by default. Set Accept: text/plain for a formatted text version
 * (useful for Telegram delivery or logging).
 */
export async function GET(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = request.headers.get("authorization")!.slice(7);
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const stmt = await generateIncomeStatement(keyHash);

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/plain")) {
    return new Response(formatIncomeText(stmt), {
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(stmt, { headers: CORS_HEADERS });
}
