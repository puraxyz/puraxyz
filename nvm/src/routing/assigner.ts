/**
 * Job assignment publisher — publishes kind-31903 events when
 * the routing algorithm selects an agent for a job.
 */

import { finalizeEvent } from 'nostr-tools';
import type { NostrClient } from '../client/NostrClient.js';
import { buildJobAssignment } from '../events/builders.js';
import type { RoutingResult } from './router.js';

/**
 * Publish a kind-31903 job assignment event.
 *
 * @param client     Nostr client connected to relays
 * @param routerKey  Router's private key (signs the assignment)
 * @param routerPub  Router's public key
 * @param jobRequestEventId  The NIP-90 job request event being assigned
 * @param customerPubkey     The customer who published the job request
 * @param result     Output from routeJob()
 */
export async function publishAssignment(
  client: NostrClient,
  routerKey: Uint8Array,
  routerPub: string,
  jobRequestEventId: string,
  customerPubkey: string,
  result: RoutingResult,
): Promise<string> {
  const unsigned = buildJobAssignment(routerPub, {
    jobRequestEventId,
    assignedAgentPubkey: result.agent.pubkey,
    customerPubkey,
    routingScore: result.routingScore,
    explored: result.explored,
    priceMsats: result.priceMsats,
    alternatives: result.alternatives,
  });

  const signed = finalizeEvent(unsigned, routerKey);
  await client.publish(signed);
  return signed.id;
}
