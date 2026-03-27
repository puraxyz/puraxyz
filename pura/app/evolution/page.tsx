"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/*
 * Evolution dashboard — real-time phylogeny visualization
 * of the NVM agent population. Consumes kind-31917 (AgentGenome)
 * and kind-31912 (SpawningEvent) from a Nostr relay.
 *
 * Renders a force-directed tree using Canvas 2D. Each node is an
 * agent; edges connect parent→child. Node size reflects fitness.
 */

interface GenomeNode {
  pubkey: string;
  parentPubkey: string | null;
  generation: number;
  fitness: number;
  mutationDescription: string;
  skillConfigHash: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SpawnEvent {
  childPubkey: string;
  skillType: string;
  investmentMsats: number;
  revenueShareBps: number;
  timestamp: number;
}

function shortKey(hex: string): string {
  return hex.slice(0, 8) + "…" + hex.slice(-4);
}

const KIND_GENOME = 31917;
const KIND_SPAWN = 31912;

export default function EvolutionPage() {
  const [nodes, setNodes] = useState<Map<string, GenomeNode>>(new Map());
  const [spawns, setSpawns] = useState<SpawnEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [relayUrl, setRelayUrl] = useState("ws://localhost:7777");
  const [selected, setSelected] = useState<GenomeNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to relay and subscribe to genome + spawn events
  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(relayUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to genome and spawn events
      ws.send(JSON.stringify(["REQ", "evo", { kinds: [KIND_GENOME, KIND_SPAWN] }]));
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] !== "EVENT" || !data[2]) return;
        const event = data[2];

        if (event.kind === KIND_GENOME) {
          const getTag = (name: string) => event.tags?.find((t: string[]) => t[0] === name)?.[1];
          const generation = Number(getTag("generation")) || 0;
          setNodes((prev) => {
            const next = new Map(prev);
            const existing = next.get(event.pubkey);
            next.set(event.pubkey, {
              pubkey: event.pubkey,
              parentPubkey: getTag("parent") ?? null,
              generation,
              fitness: Number(getTag("fitness")) || 0,
              mutationDescription: getTag("mutation_description") ?? "",
              skillConfigHash: getTag("skill_config_hash") ?? "",
              x: existing?.x ?? 400 + Math.random() * 200 - 100,
              y: existing?.y ?? 50 + generation * 80 + Math.random() * 40,
              vx: 0,
              vy: 0,
            });
            return next;
          });
        }

        if (event.kind === KIND_SPAWN) {
          const getTag = (name: string) => event.tags?.find((t: string[]) => t[0] === name)?.[1];
          setSpawns((prev) =>
            [
              {
                childPubkey: getTag("d") ?? "",
                skillType: getTag("skill_type") ?? "",
                investmentMsats: Number(getTag("investment_msats")) || 0,
                revenueShareBps: Number(getTag("revenue_share_bps")) || 0,
                timestamp: event.created_at,
              },
              ...prev,
            ].slice(0, 100),
          );
        }
      } catch {
        // skip malformed events
      }
    };
  }, [relayUrl]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  // Canvas rendering loop — simple force-directed layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function tick() {
      if (!ctx || !canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const arr = Array.from(nodes.values());

      // Simple force simulation
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]!;
        // Repulsion between all pairs
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = 500 / (dist * dist);
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }

        // Attraction to parent
        if (a.parentPubkey) {
          const parent = nodes.get(a.parentPubkey);
          if (parent) {
            const dx = parent.x - a.x;
            const dy = parent.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            a.vx += dx * 0.005;
            a.vy += dy * 0.005;
          }
        }

        // Gravity toward center
        a.vx += (W / 2 - a.x) * 0.0005;
        a.vy += (H / 2 - a.y) * 0.0005;

        // Damping
        a.vx *= 0.9;
        a.vy *= 0.9;
        a.x += a.vx;
        a.y += a.vy;

        // Bounds
        a.x = Math.max(20, Math.min(W - 20, a.x));
        a.y = Math.max(20, Math.min(H - 20, a.y));
      }

      // Draw edges
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (const node of arr) {
        if (!node.parentPubkey) continue;
        const parent = nodes.get(node.parentPubkey);
        if (!parent) continue;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of arr) {
        const radius = Math.max(4, Math.min(20, 4 + node.fitness / 1000));
        const isSelected = selected?.pubkey === node.pubkey;

        // Color by generation
        const hue = (node.generation * 60) % 360;
        ctx.fillStyle = isSelected ? "#fff" : `hsl(${hue}, 70%, 50%)`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        ctx.fillText(shortKey(node.pubkey), node.x + radius + 4, node.y + 3);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, selected]);

  // Handle canvas clicks
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodes.values()) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 400) {
        setSelected(node);
        return;
      }
    }
    setSelected(null);
  }

  const stats = {
    total: nodes.size,
    maxGen: Array.from(nodes.values()).reduce((m, n) => Math.max(m, n.generation), 0),
    avgFitness:
      nodes.size > 0
        ? Math.round(
            Array.from(nodes.values()).reduce((s, n) => s + n.fitness, 0) / nodes.size,
          )
        : 0,
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-mono font-bold">Agent evolution</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Real-time phylogeny of spawning agents on the NVM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm font-mono w-64"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
            />
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 mb-4 text-sm font-mono text-zinc-400">
          <span>agents: {stats.total}</span>
          <span>max generation: {stats.maxGen}</span>
          <span>avg fitness: {stats.avgFitness}</span>
          <span>spawns logged: {spawns.length}</span>
        </div>

        {/* Main area: canvas + detail panel */}
        <div className="flex gap-6">
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="bg-zinc-950 border border-zinc-800 rounded-lg w-full"
              style={{ cursor: "crosshair" }}
              onClick={handleCanvasClick}
            />
          </div>

          {/* Side panel */}
          <div className="w-72 space-y-4">
            {/* Selected node detail */}
            {selected && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm font-mono">
                <h3 className="text-zinc-400 mb-2">Selected agent</h3>
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">pubkey:</span>{" "}
                    {shortKey(selected.pubkey)}
                  </div>
                  <div>
                    <span className="text-zinc-500">generation:</span>{" "}
                    {selected.generation}
                  </div>
                  <div>
                    <span className="text-zinc-500">fitness:</span>{" "}
                    {selected.fitness}
                  </div>
                  <div>
                    <span className="text-zinc-500">parent:</span>{" "}
                    {selected.parentPubkey ? shortKey(selected.parentPubkey) : "root"}
                  </div>
                  <div>
                    <span className="text-zinc-500">mutation:</span>{" "}
                    <span className="text-zinc-300">{selected.mutationDescription || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent spawns */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm font-mono">
              <h3 className="text-zinc-400 mb-2">Recent spawns</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {spawns.length === 0 && (
                  <p className="text-zinc-600">No spawning events yet</p>
                )}
                {spawns.slice(0, 20).map((s, i) => (
                  <div key={i} className="text-xs text-zinc-500">
                    <span className="text-zinc-300">{shortKey(s.childPubkey)}</span>{" "}
                    spawned for {s.skillType} ({s.investmentMsats}ms,{" "}
                    {s.revenueShareBps / 100}% share)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
