import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const revalidate = 60;

const client = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

export async function GET() {
  try {
    const blockNumber = await client.getBlockNumber();

    return NextResponse.json({
      blockNumber: Number(blockNumber),
      contracts: 17,
      tests: 125,
      network: "Base Sepolia",
    });
  } catch {
    return NextResponse.json({
      blockNumber: 0,
      contracts: 17,
      tests: 125,
      network: "Base Sepolia",
    });
  }
}
