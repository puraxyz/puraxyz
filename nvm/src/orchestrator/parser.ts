/**
 * Pipeline parser — convert kind-31904 Nostr events into DAG structures.
 *
 * The event's `node` tags encode:
 *   ["node", id, jobKind, "dep1,dep2", '{"param":"value"}']
 */

import type { Event } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';
import type { PipelineSpec, PipelineNode } from '../events/kinds.js';
import { DAG } from './dag.js';

/**
 * Parse a kind-31904 event into a PipelineSpec + DAG.
 * Throws if the event is malformed or the DAG contains cycles.
 */
export function parsePipelineEvent(event: Event): { spec: PipelineSpec; dag: DAG } {
  if (event.kind !== NVM_KINDS.PIPELINE_SPEC) {
    throw new Error(`Expected kind ${NVM_KINDS.PIPELINE_SPEC}, got ${event.kind}`);
  }

  const pipelineId = tagValue(event, 'd');
  if (!pipelineId) throw new Error('Missing d-tag (pipeline ID)');

  const budgetMsats = parseInt(tagValue(event, 'budget_msats') ?? '0', 10);
  const deadline = parseInt(tagValue(event, 'deadline') ?? '0', 10);

  let meta: { name?: string; description?: string } = {};
  try {
    meta = JSON.parse(event.content || '{}');
  } catch {
    // content is optional — ignore parse failures
  }

  const nodes: PipelineNode[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'node' || tag.length < 4) continue;

    const id = tag[1];
    const jobKind = parseInt(tag[2], 10);
    const deps = tag[3] ? tag[3].split(',').filter((d) => d !== '') : [];
    let params: Record<string, unknown> = {};
    if (tag[4]) {
      try {
        params = JSON.parse(tag[4]);
      } catch {
        // malformed params — skip silently
      }
    }

    nodes.push({ id, jobKind, dependsOn: deps, params });
  }

  if (nodes.length === 0) {
    throw new Error('Pipeline has no nodes');
  }

  const spec: PipelineSpec = {
    pipelineId,
    name: meta.name ?? pipelineId,
    description: meta.description,
    budgetMsats,
    deadline,
    nodes,
  };

  const dag = new DAG(nodes);
  return { spec, dag };
}

/** Get first value for a given tag name. */
function tagValue(event: Event, name: string): string | undefined {
  const tag = event.tags.find((t) => t[0] === name);
  return tag?.[1];
}
