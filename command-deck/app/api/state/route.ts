import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORE_TASK_TYPE =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

export async function GET() {
  try {
    // Dynamic requires — SDK may not be synced in dev
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("@backproto/sdk") as {
      getAddresses: (chainId: number) => Record<string, unknown>;
      pool: {
        getTotalMembers: (...args: unknown[]) => Promise<bigint>;
        getFlowRate: (...args: unknown[]) => Promise<bigint>;
      };
      completion: {
        getAverageCompletionRate: (...args: unknown[]) => Promise<bigint>;
      };
    };
    const { publicClient, chainId } = await import("@/lib/chain");

    const addrs = sdk.getAddresses(chainId);

    const [memberCount, flowRate, compRate] = await Promise.all([
      sdk.pool
        .getTotalMembers(publicClient, addrs, CORE_TASK_TYPE)
        .catch(() => 0n),
      sdk.pool
        .getFlowRate(publicClient, addrs, CORE_TASK_TYPE)
        .catch(() => 0n),
      sdk.completion
        .getAverageCompletionRate(publicClient, addrs, CORE_TASK_TYPE)
        .catch(() => 0n),
    ]);

    return NextResponse.json({
      activeSinks: Number(memberCount),
      poolFlowRate: flowRate.toString(),
      completionRate: `${Number(compRate)}%`,
    });
  } catch {
    // SDK not synced or chain unreachable
    return NextResponse.json({});
  }
}
