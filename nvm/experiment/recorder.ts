/**
 * Experiment recorder — captures all NVM events during an experiment
 * run and writes them to a JSONL file for offline analysis.
 *
 * Subscribes to ALL NVM kinds (31900-31905) plus NIP-90 job/result
 * kinds and zap receipts. Each line is a timestamped event.
 */

import { NostrClient } from '../src/client/NostrClient.js';
import { NVM_KINDS } from '../src/events/kinds.js';
import type { Event, Filter } from 'nostr-tools';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOCAL_RELAY = process.env.NVM_RELAY ?? 'ws://localhost:7777';

export interface RecorderConfig {
  /** Output directory for recorded data. */
  outputDir: string;
  /** Experiment name (used in filename). */
  experimentName: string;
}

export class EventRecorder {
  private client: NostrClient;
  private outputPath: string;
  private eventCount = 0;
  private sub: { close: () => void } | null = null;

  constructor(config: RecorderConfig) {
    this.client = new NostrClient({ relays: [LOCAL_RELAY] });

    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputPath = join(
      config.outputDir,
      `${config.experimentName}-${timestamp}.jsonl`,
    );

    // Write header
    writeFileSync(this.outputPath, '');
  }

  /** Start recording all NVM events. */
  start(): void {
    const allNvmKinds = Object.values(NVM_KINDS);
    // Also capture NIP-90 job requests/results (5000-5999, 6000-6999)
    // and zap receipts (9735)
    const filter: Filter = {
      kinds: [
        ...allNvmKinds,
        5001, 5002, 5050, 5100, // common NIP-90 job kinds
        6001, 6002, 6050, 6100, // corresponding result kinds
        9735, // zap receipt
      ],
    };

    this.sub = this.client.subscribe([filter], (event: Event) => {
      this.record(event);
    });

    console.log(`[RECORDER] Recording to ${this.outputPath}`);
  }

  stop(): void {
    this.sub?.close();
    this.sub = null;
    this.client.close();
    console.log(`[RECORDER] Stopped. ${this.eventCount} events recorded.`);
  }

  private record(event: Event): void {
    const line = JSON.stringify({
      recorded_at: Date.now(),
      event,
    });
    appendFileSync(this.outputPath, line + '\n');
    this.eventCount++;
  }

  /** How many events recorded so far. */
  count(): number {
    return this.eventCount;
  }

  /** Path to the output file. */
  path(): string {
    return this.outputPath;
  }
}
