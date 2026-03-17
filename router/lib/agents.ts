import type { Hash } from "viem";
import type { AgentName } from "./wallets.js";

/** Well-known task type for the router demo */
export const TASK_TYPE_ID: Hash =
  "0x726f757465720000000000000000000000000000000000000000000000000000"; // keccak-like identifier "router"

export interface AgentPersona {
  name: AgentName;
  label: string;
  color: string;
  /** Declared capacity units */
  declaredCapacity: bigint;
  /** Actual deliverable capacity (Cipher lies) */
  actualCapacity: bigint;
  /** Queue load multiplier per scenario phase (1.0 = baseline) */
  loadMultiplier: Record<ScenarioPhase, number>;
  /** Completion probability per tick (1.0 = always completes, Cipher ~0.6) */
  completionRate: number;
}

export type ScenarioPhase = "RAMP" | "STEADY" | "SPIKE" | "SHOCK" | "RECOVER";

export const agents: Record<AgentName, AgentPersona> = {
  atlas: {
    name: "atlas",
    label: "Atlas",
    color: "#22c55e",
    declaredCapacity: 80n,
    actualCapacity: 80n,
    loadMultiplier: { RAMP: 0.3, STEADY: 0.5, SPIKE: 0.9, SHOCK: 1.0, RECOVER: 0.6 },
    completionRate: 0.95,
  },
  beacon: {
    name: "beacon",
    label: "Beacon",
    color: "#3b82f6",
    declaredCapacity: 40n,
    actualCapacity: 40n,
    loadMultiplier: { RAMP: 0.2, STEADY: 0.4, SPIKE: 0.95, SHOCK: 1.0, RECOVER: 0.5 },
    completionRate: 0.90,
  },
  cipher: {
    name: "cipher",
    label: "Cipher",
    color: "#ef4444",
    declaredCapacity: 50n,
    actualCapacity: 30n, // dishonest — claims 50 but delivers 30
    loadMultiplier: { RAMP: 0.2, STEADY: 0.3, SPIKE: 0.7, SHOCK: 0.8, RECOVER: 0.3 },
    completionRate: 0.60, // frequently fails
  },
};

export const agentList: AgentName[] = ["atlas", "beacon", "cipher"];
