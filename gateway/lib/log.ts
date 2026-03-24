/**
 * Structured JSON logger for the gateway.
 * Writes JSON lines to stdout. In Vercel, these get picked up by the log drain.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  service: string;
  event: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry) {
  const line = { ts: new Date().toISOString(), ...entry };
  console.log(JSON.stringify(line));
}

export const log = {
  info(event: string, data?: Record<string, unknown>) {
    emit({ level: "info", service: "pura-gateway", event, ...data });
  },
  warn(event: string, data?: Record<string, unknown>) {
    emit({ level: "warn", service: "pura-gateway", event, ...data });
  },
  error(event: string, data?: Record<string, unknown>) {
    emit({ level: "error", service: "pura-gateway", event, ...data });
  },
};
