import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { completeTask, getTask } from "@/lib/marketplace";
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
 * POST /api/marketplace/complete — mark a task as completed.
 * Body: { taskId, qualityRating (0-1) }
 * Called by the requester after reviewing the result.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401, headers: CORS_HEADERS });
  }

  let body: { taskId?: string; qualityRating?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body.taskId || typeof body.qualityRating !== "number") {
    return NextResponse.json(
      { error: { message: "taskId and qualityRating (0-1) are required" } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const task = getTask(body.taskId);
  if (!task) {
    return NextResponse.json(
      { error: { message: "Task not found" } },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  if (!task.assignedTo) {
    return NextResponse.json(
      { error: { message: "Task has no assigned agent" } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const completed = completeTask(body.taskId, task.assignedTo, body.qualityRating);
  if (!completed) {
    return NextResponse.json(
      { error: { message: "Task cannot be completed — wrong status or agent" } },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      taskId: completed.taskId,
      status: completed.status,
      qualityRating: completed.qualityRating,
      verified_by: "pura",
      url: "https://pura.xyz",
    },
    {
      headers: {
        ...CORS_HEADERS,
        "X-Pura-Verified": "true",
      },
    },
  );
}
