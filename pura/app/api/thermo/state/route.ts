import { NextResponse } from "next/server";
import { getAddresses, temperature, virial } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";

export const runtime = "nodejs";

const PRECISION = 1_000_000_000_000_000_000n; // 1e18

const PHASE_NAMES = ["Steady", "Bull", "Shock", "Recovery", "Collapse"] as const;

function derivePhase(temp: bigint, v: bigint, pressure: bigint): number {
  if (pressure > 95n * PRECISION / 100n || v > 5n * PRECISION) return 4;
  if (pressure > 80n * PRECISION / 100n || v < 2n * PRECISION / 10n) return 2;
  if (v > 15n * PRECISION / 10n) return 1;
  if (temp > 3n * PRECISION && v < 8n * PRECISION / 10n) return 3;
  return 0;
}

function fmt18(val: bigint, decimals = 2): string {
  const whole = val / PRECISION;
  const frac = val % PRECISION;
  const fracStr = frac.toString().padStart(18, "0").slice(0, decimals);
  return `${whole}.${fracStr}`;
}

export async function GET() {
  const addrs = getAddresses(chainId);

  const isDeployed =
    addrs.temperatureOracle !== "0x0000000000000000000000000000000000000000";

  if (!isDeployed) {
    // Seed data — deterministic from wall clock
    const t = Date.now();
    const cycle = Math.sin((2 * Math.PI * t) / 600_000); // 10-min period
    const tau = 0.5 + (cycle + 1) * 2.25; // 0.5 – 5.0
    const v = 0.6 + (Math.cos((2 * Math.PI * t) / 900_000) + 1) * 0.4; // 0.6 – 1.4
    const p = Math.max(0, Math.min(1, 0.3 + Math.sin((2 * Math.PI * t) / 480_000) * 0.35));
    const demurrage = v < 1.0 ? 1 + (10 - 1) * (1 - v) : 1;
    const phaseIdx =
      p > 0.95 || v > 5
        ? 4
        : p > 0.8 || v < 0.2
          ? 2
          : v > 1.5
            ? 1
            : tau > 3 && v < 0.8
              ? 3
              : 0;

    return NextResponse.json({
      temperature: tau.toFixed(2),
      virialRatio: v.toFixed(2),
      escrowPressure: p.toFixed(2),
      demurrageRate: demurrage.toFixed(1),
      phase: PHASE_NAMES[phaseIdx],
      phaseIndex: phaseIdx,
      tauMin: "0.50",
      tauMax: "5.00",
      equilibriumTarget: "1.00",
      chainId,
      seed: true,
    });
  }

  // Live on-chain reads
  const rpcResult = await Promise.race([
    Promise.all([
      temperature.getTemperature(publicClient, addrs).catch(() => PRECISION),
      temperature.getTauBounds(publicClient, addrs).catch(() => ({
        tauMin: 5n * PRECISION / 10n,
        tauMax: 5n * PRECISION,
      })),
      virial.getVirialRatio(publicClient, addrs).catch(() => PRECISION),
      virial.getRecommendedDemurrageRate(publicClient, addrs).catch(() => 0n),
      virial.getEquilibriumTarget(publicClient, addrs).catch(() => PRECISION),
    ]),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("rpc timeout")), 5_000),
    ),
  ]).catch(() => null);

  if (!rpcResult) {
    return NextResponse.json(
      { error: "rpc timeout", seed: true },
      { status: 503 },
    );
  }

  const [temp, bounds, v, demRate, eqTarget] = rpcResult;

  const pressure = 0n; // would read from escrowBuffer if deployed
  const phaseIdx = derivePhase(temp, v, pressure);

  return NextResponse.json({
    temperature: fmt18(temp),
    virialRatio: fmt18(v),
    escrowPressure: fmt18(pressure),
    demurrageRate: fmt18(demRate),
    phase: PHASE_NAMES[phaseIdx],
    phaseIndex: phaseIdx,
    tauMin: fmt18(bounds.tauMin),
    tauMax: fmt18(bounds.tauMax),
    equilibriumTarget: fmt18(eqTarget),
    chainId,
    seed: false,
  });
}
