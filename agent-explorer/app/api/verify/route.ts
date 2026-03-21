import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const VR_API_BASE = process.env.VR_API_URL || "https://api.vr.dev/v1";

interface VerifyRequest {
  agentId: string;
  executionId: string;
  verifierIds?: string[];
}

/**
 * POST /api/verify — trigger a vr.dev verification pipeline for an agent execution.
 * Returns the verdict + evidence hash. Does NOT submit on-chain.
 */
export async function POST(request: NextRequest) {
  let body: VerifyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, executionId, verifierIds } = body;
  if (!agentId || !executionId) {
    return NextResponse.json(
      { error: "agentId and executionId are required" },
      { status: 400 },
    );
  }

  try {
    const vrResponse = await fetch(`${VR_API_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        execution_id: executionId,
        verifier_ids: verifierIds,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!vrResponse.ok) {
      const text = await vrResponse.text();
      return NextResponse.json(
        { error: `vr.dev API error: ${vrResponse.status}`, detail: text },
        { status: 502 },
      );
    }

    const result = await vrResponse.json();
    return NextResponse.json({
      verdict: result.verdict,
      score: result.score,
      evidenceHash: result.artifact_hash ?? result.evidence_hash,
      tier: result.tier,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
