import { getAddresses, completion } from "@puraxyz/sdk";
import { chainId, operatorWallet } from "../shared/chain";
import { GATEWAY_TASK_TYPE } from "./routing";
import type { Provider } from "./providers";

export async function recordCompletionEpoch(
  provider: Provider,
): Promise<string | null> {
  try {
    const addrs = getAddresses(chainId);
    const wallet = operatorWallet();
    const sinkAddress =
      provider === "openai"
        ? (process.env.OPENAI_SINK_ADDRESS as `0x${string}`)
        : (process.env.ANTHROPIC_SINK_ADDRESS as `0x${string}`);

    if (!sinkAddress) return null;

    const hash = await completion.advanceCompletionEpoch(
      wallet,
      addrs,
      GATEWAY_TASK_TYPE,
      sinkAddress,
    );
    return hash;
  } catch {
    return null;
  }
}
