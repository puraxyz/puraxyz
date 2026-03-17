"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./BackpressureFlow.module.css";

/* ── Layout ─────────────────────────────────────────────────────── */

interface Node {
  x: number;
  y: number;
  r: number;
  label: string;
  color: string;
  capacity: number;   // 0-1, how full this agent currently is
  capDir: number;     // +1 filling, -1 draining
  speed: number;      // capacity fill speed multiplier
}

interface Particle {
  t: number;          // 0-1 progress along path
  target: number;     // index into agents[]
  speed: number;      // units per frame
  opacity: number;
  size: number;
  redirected: boolean;
}

const AGENT_COLORS = ["#0d9488", "#d97706", "#a16207", "#6366f1"];
const AGENT_LABELS = ["AI Agents", "Demurrage", "Lightning", "Nostr"];

/* Eased cubic bezier path from source → router → agent */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function BackpressureFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<{
    agents: Node[];
    router: Node;
    source: Node;
    particles: Particle[];
    w: number;
    h: number;
    dpr: number;
    tick: number;
  } | null>(null);

  const initState = useCallback((w: number, h: number, dpr: number) => {
    const cx = w / 2;
    const sourceX = w * 0.08;
    const routerX = w * 0.35;
    const agentStartX = w * 0.62;
    const agentEndX = w * 0.92;
    const agentSpanX = agentEndX - agentStartX;

    const source: Node = {
      x: sourceX, y: h * 0.5, r: 18, label: "Demand",
      color: "#e4e4e7", capacity: 0, capDir: 0, speed: 0,
    };

    const router: Node = {
      x: routerX, y: h * 0.5, r: 22, label: "Router",
      color: "#d97706", capacity: 0, capDir: 0, speed: 0,
    };

    const agents: Node[] = AGENT_COLORS.map((color, i) => ({
      x: agentStartX + (agentSpanX * i) / (AGENT_COLORS.length - 1),
      y: h * (0.2 + (i % 2 === 0 ? 0 : 0.15) + i * 0.15),
      r: 16,
      label: AGENT_LABELS[i],
      color,
      capacity: 0.1 + Math.random() * 0.3,
      capDir: 1,
      speed: 0.3 + Math.random() * 0.5,
    }));

    return {
      agents,
      router,
      source,
      particles: [] as Particle[],
      w,
      h,
      dpr,
      tick: 0,
    };
  }, []);

  /* ── Spawn a particle towards the best-available agent ──── */
  function spawnParticle(state: NonNullable<typeof stateRef.current>) {
    // Pick agent with lowest capacity (the BPE logic)
    let best = 0;
    let bestCap = state.agents[0].capacity;
    for (let i = 1; i < state.agents.length; i++) {
      if (state.agents[i].capacity < bestCap) {
        best = i;
        bestCap = state.agents[i].capacity;
      }
    }

    state.particles.push({
      t: 0,
      target: best,
      speed: 0.004 + Math.random() * 0.003,
      opacity: 0.5 + Math.random() * 0.5,
      size: 1.5 + Math.random() * 1.5,
      redirected: false,
    });
  }

  /* ── Get position along the source → router → agent bezier path */
  function getPos(
    state: NonNullable<typeof stateRef.current>,
    p: Particle,
  ): [number, number] {
    const s = state.source;
    const r = state.router;
    const a = state.agents[p.target];
    const t = ease(p.t);

    if (t < 0.45) {
      // Source → Router segment
      const st = t / 0.45;
      const midX = lerp(s.x, r.x, 0.5);
      const midY = s.y + (r.y - s.y) * 0.3;
      // Quadratic bezier
      const x = (1 - st) * (1 - st) * s.x + 2 * (1 - st) * st * midX + st * st * r.x;
      const y = (1 - st) * (1 - st) * s.y + 2 * (1 - st) * st * midY + st * st * r.y;
      return [x, y];
    } else {
      // Router → Agent segment
      const st = (t - 0.45) / 0.55;
      const midX = lerp(r.x, a.x, 0.5);
      const midY = lerp(r.y, a.y, 0.35);
      const x = (1 - st) * (1 - st) * r.x + 2 * (1 - st) * st * midX + st * st * a.x;
      const y = (1 - st) * (1 - st) * r.y + 2 * (1 - st) * st * midY + st * st * a.y;
      return [x, y];
    }
  }

  /* ── Update simulation step ────────────────────────────── */
  function updateSim(state: NonNullable<typeof stateRef.current>) {
    state.tick++;

    // Spawn particles
    const reducing = typeof window !== "undefined" && window.innerWidth < 640;
    const spawnRate = reducing ? 3 : 2;
    if (state.tick % spawnRate === 0) {
      spawnParticle(state);
    }

    // Update agent capacities (oscillate)
    for (const a of state.agents) {
      a.capacity += a.capDir * a.speed * 0.005;
      if (a.capacity >= 0.95) {
        a.capDir = -1;
        a.capacity = 0.95;
      } else if (a.capacity <= 0.05) {
        a.capDir = 1;
        a.capacity = 0.05;
      }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      const agent = state.agents[p.target];

      // Slow down if target agent is near capacity (backpressure!)
      const capacityFactor = agent.capacity > 0.8 ? 0.3 : agent.capacity > 0.6 ? 0.6 : 1;

      // If agent is overloaded and particle hasn't passed router yet, redirect
      if (!p.redirected && p.t < 0.4 && agent.capacity > 0.85) {
        let best = p.target;
        let bestCap = agent.capacity;
        for (let j = 0; j < state.agents.length; j++) {
          if (j !== p.target && state.agents[j].capacity < bestCap) {
            best = j;
            bestCap = state.agents[j].capacity;
          }
        }
        if (best !== p.target) {
          p.target = best;
          p.redirected = true;
        }
      }

      p.t += p.speed * capacityFactor;

      // Particle arrived — increase agent capacity
      if (p.t >= 1) {
        agent.capacity = Math.min(0.95, agent.capacity + 0.04);
        state.particles.splice(i, 1);
      }
    }
  }

  /* ── Draw frame ────────────────────────────────────────── */
  function drawFrame(
    ctx: CanvasRenderingContext2D,
    state: NonNullable<typeof stateRef.current>,
  ) {
    const { w, h, dpr } = state;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // ─── Connection lines (source → router → each agent) ───
    const s = state.source;
    const r = state.router;

    for (const a of state.agents) {
      const load = a.capacity;
      const alpha = 0.06 + (1 - load) * 0.12;
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      // Source to router
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(lerp(s.x, r.x, 0.5), s.y + (r.y - s.y) * 0.3, r.x, r.y);
      ctx.stroke();

      // Router to agent
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.quadraticCurveTo(lerp(r.x, a.x, 0.5), lerp(r.y, a.y, 0.35), a.x, a.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // ─── Particles ──────────────────────────────────────────
    for (const p of state.particles) {
      const [px, py] = getPos(state, p);
      const agent = state.agents[p.target];
      const glow = p.redirected ? "#f59e0b" : agent.color;

      // Glow
      ctx.beginPath();
      ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
      grad.addColorStop(0, glow + "40");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.redirected ? "#f59e0b" : "#e4e4e7";
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ─── Source node ────────────────────────────────────────
    drawNode(ctx, s, false);

    // ─── Router node ────────────────────────────────────────
    drawNode(ctx, r, false);

    // ─── Agent nodes with capacity bars ─────────────────────
    for (const a of state.agents) {
      drawNode(ctx, a, true);
    }

    ctx.restore();
  }

  function drawNode(
    ctx: CanvasRenderingContext2D,
    node: Node,
    showCapacity: boolean,
  ) {
    const { x, y, r, label, color, capacity } = node;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Fill
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = color + "15";
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.font = "500 10px var(--font-mono), monospace";
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + r + 16);

    // Capacity bar
    if (showCapacity) {
      const barW = r * 2.2;
      const barH = 3;
      const barX = x - barW / 2;
      const barY = y + r + 22;

      // Track
      ctx.fillStyle = "#27272a";
      ctx.fillRect(barX, barY, barW, barH);

      // Fill — color shifts to red when high
      const fillColor =
        capacity > 0.8 ? "#ef4444" : capacity > 0.6 ? "#eab308" : color;
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(barX, barY, barW * capacity, barH);
      ctx.globalAlpha = 1;
    }
  }

  /* ── Setup and animation loop ──────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      if (!stateRef.current) {
        stateRef.current = initState(rect.width, rect.height, dpr);
      } else {
        const old = stateRef.current;
        const s = initState(rect.width, rect.height, dpr);
        // Preserve capacities
        for (let i = 0; i < s.agents.length; i++) {
          s.agents[i].capacity = old.agents[i]?.capacity ?? s.agents[i].capacity;
          s.agents[i].capDir = old.agents[i]?.capDir ?? s.agents[i].capDir;
        }
        s.tick = old.tick;
        stateRef.current = s;
      }
    }

    resize();
    window.addEventListener("resize", resize);

    let running = true;
    function loop() {
      if (!running || !ctx || !stateRef.current) return;
      updateSim(stateRef.current);
      drawFrame(ctx, stateRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initState]);

  return (
    <div className={styles.flowContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
