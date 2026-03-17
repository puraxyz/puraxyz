import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";

export const revalidate = 60;

const sepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

const mainnetClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

export async function GET() {
  try {
    const [sepoliaBlock, mainnetBlock] = await Promise.allSettled([
      sepoliaClient.getBlockNumber(),
      mainnetClient.getBlockNumber(),
    ]);

    return NextResponse.json({
      blockNumber: sepoliaBlock.status === "fulfilled" ? Number(sepoliaBlock.value) : 0,
      mainnetBlockNumber: mainnetBlock.status === "fulfilled" ? Number(mainnetBlock.value) : 0,
      contracts: 22,
      tests: 213,
      networks: ["Base Sepolia", "Base Mainnet"],
    });
  } catch {
    return NextResponse.json({
      blockNumber: 0,
      mainnetBlockNumber: 0,
      contracts: 22,
      tests: 213,
      networks: ["Base Sepolia", "Base Mainnet"],
    });
  }
}
