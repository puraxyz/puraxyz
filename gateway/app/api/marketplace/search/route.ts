import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { searchSkills } from "@/lib/marketplace";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** GET /api/marketplace/search?skill=code-review&maxPrice=2000 */
export async function GET(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const skill = url.searchParams.get("skill");
  if (!skill) {
    return NextResponse.json(
      { error: { message: "skill query parameter is required" } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const maxPriceStr = url.searchParams.get("maxPrice");
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : undefined;

  const results = searchSkills({ skillType: skill, maxPrice });

  return NextResponse.json({ results }, { headers: CORS_HEADERS });
}
