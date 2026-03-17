import type { ScenarioPhase } from "./agents.js";

/**
 * Scenario state machine: RAMP → STEADY → SPIKE → SHOCK → RECOVER → RAMP…
 *
 * Phase durations in ticks (1 tick = 1 minute):
 *   RAMP: 10, STEADY: 20, SPIKE: 10, SHOCK: 5, RECOVER: 15 = 60 tick cycle
 */

interface PhaseConfig {
  duration: number; // ticks
  flowRateMultiplier: number; // relative to base flow
}

const PHASES: Record<ScenarioPhase, PhaseConfig> = {
  RAMP:    { duration: 10, flowRateMultiplier: 0.5 },
  STEADY:  { duration: 20, flowRateMultiplier: 1.0 },
  SPIKE:   { duration: 10, flowRateMultiplier: 2.0 },
  SHOCK:   { duration: 5,  flowRateMultiplier: 3.0 },
  RECOVER: { duration: 15, flowRateMultiplier: 0.7 },
};

const PHASE_ORDER: ScenarioPhase[] = ["RAMP", "STEADY", "SPIKE", "SHOCK", "RECOVER"];
const CYCLE_LENGTH = PHASE_ORDER.reduce((sum, p) => sum + PHASES[p].duration, 0); // 60

export interface ScenarioState {
  phase: ScenarioPhase;
  tickInPhase: number;
  tickInCycle: number;
  flowRateMultiplier: number;
}

/**
 * Derive scenario state from a global tick counter.
 * No persistent storage needed — purely deterministic from tick number.
 */
export function getScenarioState(tickNumber: number): ScenarioState {
  const tickInCycle = tickNumber % CYCLE_LENGTH;

  let elapsed = 0;
  for (const phase of PHASE_ORDER) {
    const config = PHASES[phase];
    if (tickInCycle < elapsed + config.duration) {
      return {
        phase,
        tickInPhase: tickInCycle - elapsed,
        tickInCycle,
        flowRateMultiplier: config.flowRateMultiplier,
      };
    }
    elapsed += config.duration;
  }

  // Fallback (shouldn't reach)
  return {
    phase: "RAMP",
    tickInPhase: 0,
    tickInCycle,
    flowRateMultiplier: 0.5,
  };
}

/** Base flow rate: 1e15 wei/sec (~0.001 tokens/sec, ~86.4 tokens/day) */
export const BASE_FLOW_RATE = 1000000000000000n; // 1e15

export function getFlowRate(scenario: ScenarioState): bigint {
  return BigInt(Math.floor(Number(BASE_FLOW_RATE) * scenario.flowRateMultiplier));
}
