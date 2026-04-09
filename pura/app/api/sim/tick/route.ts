import { NextResponse } from "next/server";
import { executeTick } from "@/lib/sim/tick";

export const runtime = "nodejs";
export const maxDuration = 10;

const REQUIRED_KEYS = [
  "ATLAS_PRIVATE_KEY",
  "BEACON_PRIVATE_KEY",
  "CIPHER_PRIVATE_KEY",
  "DISPATCH_PRIVATE_KEY",
] as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return NextResponse.json({ skipped: true, missing }, { status: 200 });
  }

  try {
    const result = await Promise.race([
      executeTick(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("tick timeout")), 8_000),
      ),
    ]);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
