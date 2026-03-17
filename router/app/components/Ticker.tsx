"use client";

import { useRef, useEffect } from "react";
import styles from "./Ticker.module.css";

interface TickEvent {
  ts: number;
  agent: string;
  action: string;
  txHash?: string;
}

interface TickerProps {
  events: TickEvent[];
  agentMeta: Record<string, { label: string; color: string }>;
  explorerBase: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Ticker({ events, agentMeta, explorerBase }: TickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolled.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolled.current = !atBottom;
  };

  if (events.length === 0) {
    return (
      <div className={styles.wrapper}>
        <h3 className={styles.title}>Event Feed</h3>
        <div className={styles.empty}>
          Waiting for events… Tick executes every minute via CRON.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Event Feed</h3>
      <div className={styles.feed} ref={scrollRef} onScroll={handleScroll}>
        {events.map((ev, i) => {
          const meta = agentMeta[ev.agent] ?? {
            label: ev.agent,
            color: "#a1a1aa",
          };
          return (
            <div key={i} className={styles.event}>
              <span className={styles.time}>{formatTime(ev.ts)}</span>
              <span className={styles.agent} style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className={styles.action}>{ev.action}</span>
              {ev.txHash && (
                <a
                  href={`${explorerBase}/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  tx↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
