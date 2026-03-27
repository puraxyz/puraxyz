/**
 * Credit-aware dispatch — checks available credit before sending
 * a job to an agent. Falls back to atomic settlement when no
 * credit exists.
 *
 * Sits between the routing algorithm (which picks the agent)
 * and the job dispatch (which sends the NIP-90 request).
 */

import type { CreditGraph } from './graph.js';

export type DispatchMode = 'credit' | 'atomic';

export interface DispatchResult {
  mode: DispatchMode;
  agentPubkey: string;
  creditUsedMsats: number;
}

/**
 * Decide whether to dispatch a job on credit or with atomic payment.
 * If the orchestrator has sufficient credit with the target agent,
 * debit the credit line and return 'credit' mode. Otherwise return
 * 'atomic' mode so the caller sends a Lightning payment.
 */
export function dispatchWithCredit(
  orchestratorPubkey: string,
  agentPubkey: string,
  estimatedCostMsats: number,
  creditGraph: CreditGraph,
): DispatchResult {
  const available = creditGraph.availableCredit(
    orchestratorPubkey,
    agentPubkey,
  );

  if (available >= estimatedCostMsats) {
    const debited = creditGraph.useCredit(
      orchestratorPubkey,
      agentPubkey,
      estimatedCostMsats,
    );
    if (debited) {
      return {
        mode: 'credit',
        agentPubkey,
        creditUsedMsats: estimatedCostMsats,
      };
    }
  }

  return {
    mode: 'atomic',
    agentPubkey,
    creditUsedMsats: 0,
  };
}
