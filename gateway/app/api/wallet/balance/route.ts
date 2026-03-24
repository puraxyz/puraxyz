import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getSettlementProvider } from "@/lib/settlement";
import { createHash } from "crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401 });
  }

  const settlement = getSettlementProvider();
  if (!settlement) {
    return NextResponse.json(
      { error: { message: "No settlement provider configured" } },
      { status: 503 },
    );
  }

  const keyHash = createHash("sha256")
    .update(request.headers.get("authorization")!.slice(7))
    .digest("hex");

  const info = await settlement.checkBalance(keyHash);

  return NextResponse.json({
    balance: info.balance,
    estimatedRequests: info.estimatedRequests,
    rail: info.rail,
    unit: "sats",
  });
}
