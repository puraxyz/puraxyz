import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { searchSkills, createTask, assignTask } from "@/lib/marketplace";
import { createHash } from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/marketplace/hire — submit a task and auto-assign to the best agent.
 * Body: { skillType, payload, maxPrice }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = request.headers.get("authorization")!.slice(7);
  const requesterId = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  let body: { skillType?: string; payload?: string; maxPrice?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body.skillType || !body.payload || typeof body.maxPrice !== "number") {
    return NextResponse.json(
      { error: { message: "skillType, payload, and maxPrice are required" } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Find best matching agent
  const candidates = searchSkills({ skillType: body.skillType, maxPrice: body.maxPrice });
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: { message: "No agents available for this skill type and price" } },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // Create task
  const task = createTask({
    skillType: body.skillType,
    payload: body.payload,
    maxPrice: body.maxPrice,
    requesterId,
  });

  // Assign to top candidate
  const assigned = assignTask(task.taskId, candidates[0].agentId);
  if (!assigned) {
    return NextResponse.json(
      { error: { message: "Failed to assign task — agent capacity may have changed" } },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      taskId: assigned.taskId,
      assignedTo: assigned.assignedTo,
      status: assigned.status,
      price: candidates[0].price,
    },
    { status: 201, headers: CORS_HEADERS },
  );
}
