import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { registerSkill, getAgentSkills } from "@/lib/marketplace";
import { createHash } from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** POST /api/marketplace/register — register agent skills */
export async function POST(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = request.headers.get("authorization")!.slice(7);
  const agentId = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  let body: { skillType?: string; price?: number; capacity?: number; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body.skillType || typeof body.price !== "number") {
    return NextResponse.json(
      { error: { message: "skillType (string) and price (number, sats) are required" } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const reg = registerSkill({
    agentId,
    skillType: body.skillType,
    price: body.price,
    capacity: body.capacity ?? 5,
    description: body.description ?? "",
  });

  return NextResponse.json(reg, { status: 201, headers: CORS_HEADERS });
}

/** GET /api/marketplace/register — list own registrations */
export async function GET(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = request.headers.get("authorization")!.slice(7);
  const agentId = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  return NextResponse.json({ skills: getAgentSkills(agentId) }, { headers: CORS_HEADERS });
}
