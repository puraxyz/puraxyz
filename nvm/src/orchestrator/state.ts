/**
 * Pipeline state publisher — publishes kind-31905 events to track
 * live execution state of a pipeline.
 *
 * Parameterized replaceable: d-tag = pipeline event ID, so each
 * state update replaces the previous one for that pipeline.
 */

import { finalizeEvent } from 'nostr-tools';
import type { NostrClient } from '../client/NostrClient.js';
import type { PipelineState } from '../events/kinds.js';
import { buildPipelineState } from '../events/builders.js';

export class PipelineStatePublisher {
  private client: NostrClient;
  private secretKey: Uint8Array;

  constructor(client: NostrClient, secretKey: Uint8Array) {
    this.client = client;
    this.secretKey = secretKey;
  }

  async publish(state: PipelineState): Promise<string> {
    const unsigned = buildPipelineState('', state);
    const signed = finalizeEvent(unsigned, this.secretKey);
    await this.client.publish(signed);
    return signed.id;
  }
}
