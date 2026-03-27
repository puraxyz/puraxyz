/**
 * Bridge event sanitizer — strips or redacts sensitive fields
 * from events before they cross a bridge boundary.
 *
 * Prevents leaking internal routing scores, private tags,
 * or relay-specific metadata across network boundaries.
 */

import type { Event } from 'nostr-tools';

const STRIP_TAGS = new Set(['relay', 'routing-score', 'internal']);

/** Remove sensitive tags from an event before bridging. */
export function sanitizeForBridge(event: Event): Event {
  const cleanTags = event.tags.filter((t) => !STRIP_TAGS.has(t[0]!));
  return {
    ...event,
    tags: cleanTags,
  };
}

/**
 * Validate that a bridged event has proper attestation.
 * Returns true if the event has a valid bridge-attestation tag.
 */
export function hasBridgeAttestation(event: Event): boolean {
  return event.tags.some(
    (t) => t[0] === 'bridge-attestation' && t[1] && t[1].length === 64,
  );
}
