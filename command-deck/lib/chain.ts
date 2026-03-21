import {
  createPublicClient,
  http,
  type Chain,
  type PublicClient,
} from "viem";
import { baseSepolia, base } from "viem/chains";

function getChain(): Chain {
  const id = Number(process.env.CHAIN_ID ?? 84532);
  if (id === 8453) return base;
  return baseSepolia;
}

const rpcUrl = process.env.RPC_URL ?? "https://sepolia.base.org";
const chain = getChain();

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const chainId = chain.id;
