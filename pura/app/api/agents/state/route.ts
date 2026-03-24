import { NextResponse } from "next/server";
import { getAddresses, openclaw, completion, platform } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";
import { keccak256, toHex } from "viem";

export const runtime = "nodejs";

const VR_API_BASE = process.env.VR_API_URL || "https://api.vr.dev/v1";

const SKILL_TYPE: `0x${string}` =
  (process.env.AGENT_SKILL_TYPE as `0x${string}`) ??
  keccak256(toHex("code-generation"));

export async function GET() {
  const addrs = getAddresses(chainId);

  const agentIds = await openclaw
    .getAgentsForSkill(publicClient, addrs, SKILL_TYPE)
    .catch(() => [] as `0x${string}`[]);

  const agents = await Promise.all(
    agentIds.slice(0, 20).map(async (id) => {
      const [agent, reputation] = await Promise.all([
        openclaw.getAgent(publicClient, addrs, id).catch(() => null),
        openclaw
          .getOpenClawReputation(
            publicClient,
            addrs,
            "0x0000000000000000000000000000000000000000",
          )
          .catch(() => null),
      ]);
      if (!agent) return null;

      let operatorRep = reputation;
      if (agent.operator !== "0x0000000000000000000000000000000000000000") {
        operatorRep = await openclaw
          .getOpenClawReputation(publicClient, addrs, agent.operator)
          .catch(() => reputation);
      }

      const verifiedCompletions = await completion
        .getCompletions(publicClient, addrs, agent.skillTypeId as `0x${string}`, agent.operator)
        .then((n) => n.toString())
        .catch(() => "0");

      const lastEvidenceHash = await fetch(
        `${VR_API_BASE}/evidence/latest?operator=${agent.operator}`,
        { signal: AbortSignal.timeout(3000) },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.evidence_hash ?? null)
        .catch(() => null);

      return {
        id,
        operator: agent.operator,
        skillTypeId: agent.skillTypeId,
        capacity: agent.smoothedCapacity.toString(),
        active: agent.active,
        reputation: operatorRep
          ? {
              score: operatorRep.score.toString(),
              completions: operatorRep.completions.toString(),
              slashCount: operatorRep.slashCount.toString(),
            }
          : null,
        verifiedCompletions,
        lastEvidenceHash,
      };
    }),
  );

  const protocolAvailable = await platform
    .isProtocolAvailable(publicClient, addrs, 2)
    .catch(() => false);

  return NextResponse.json({
    agents: agents.filter(Boolean),
    totalAgents: agentIds.length,
    protocolAvailable,
    chainId,
  });
}
