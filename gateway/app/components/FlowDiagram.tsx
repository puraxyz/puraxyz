"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./FlowDiagram.module.css";

/* ── Layout constants ──────────────────────────────────────────── */
const PAD_X = 60;
const PAD_Y = 32;
const NODE_W = 110;
const NODE_H = 34;
const CANVAS_H = 300;

/* ── Node definitions (positions are 0-1 relative) ─────────────── */
interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  shape: "rect" | "pill";
}

const NODES: NodeDef[] = [
  { id: "app",       label: "Your App",          x: 0.05, y: 0.42, color: "#71717a", shape: "pill" },
  { id: "mandalay",  label: "◆  Mandalay",       x: 0.46, y: 0.42, color: "#d97706", shape: "rect" },
  { id: "openai",    label: "OpenAI",            x: 0.88, y: 0.18, color: "#22c55e", shape: "rect" },
  { id: "anthropic", label: "Anthropic",         x: 0.88, y: 0.42, color: "#8b5cf6", shape: "rect" },
  { id: "more",      label: "+ more",            x: 0.88, y: 0.66, color: "#3b82f6", shape: "rect" },
  { id: "registry",  label: "Capacity Registry", x: 0.46, y: 0.85, color: "#d97706", shape: "rect" },
];

interface EdgeDef {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  color?: string;
  /** If true, particles flow to→from visually (capacity signals) */
  reverse?: boolean;
}

const EDGES: EdgeDef[] = [
  { from: "app",       to: "mandalay",  label: "request" },
  { from: "mandalay",  to: "openai",    label: "route" },
  { from: "mandalay",  to: "anthropic", label: "route" },
  { from: "mandalay",  to: "more",      label: "route",    dashed: true },
  { from: "registry",  to: "mandalay",  label: "on-chain weights", dashed: true, color: "#d9770660", reverse: false },
  // Capacity signals flow backward from providers to registry
  { from: "openai",    to: "registry",  color: "#22c55e", reverse: true },
  { from: "anthropic", to: "registry",  color: "#8b5cf6", reverse: true },
];

/* ── Helpers ───────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

function bezier2(
  ax: number, ay: number, cx: number, cy: number, bx: number, by: number, t: number,
): [number, number] {
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

interface Resolved {
  id: string; label: string; color: string; shape: "rect" | "pill";
  px: number; py: number;
}

interface Particle {
  t: number;
  edgeIdx: number;
  speed: number;
  opacity: number;
  size: number;
}

interface State {
  nodes: Resolved[];
  nodeMap: Map<string, Resolved>;
  particles: Particle[];
  w: number; h: number; dpr: number;
  tick: number;
}

/* ── Component ─────────────────────────────────────────────────── */
export default function FlowDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<State | null>(null);
  const visibleRef = useRef(true);
  const reducedMotion = useRef(false);

  const buildState = useCallback((w: number, h: number, dpr: number): State => {
    const resolved: Resolved[] = NODES.map((n) => ({
      id: n.id, label: n.label, color: n.color, shape: n.shape,
      px: PAD_X + n.x * (w - 2 * PAD_X),
      py: PAD_Y + n.y * (h - 2 * PAD_Y),
    }));
    const nodeMap = new Map<string, Resolved>();
    for (const n of resolved) nodeMap.set(n.id, n);
    return { nodes: resolved, nodeMap, particles: [], w, h, dpr, tick: 0 };
  }, []);

  /* ── Edge path control point ─────────────────────────────── */
  function edgeCtrl(fromN: Resolved, toN: Resolved): [number, number] {
    return [lerp(fromN.px, toN.px, 0.5), lerp(fromN.py, toN.py, 0.3)];
  }

  /* ── Spawn particles ─────────────────────────────────────── */
  function spawnParticle(st: State) {
    const edgeIdx = Math.floor(Math.random() * EDGES.length);
    st.particles.push({
      t: 0, edgeIdx,
      speed: 0.004 + Math.random() * 0.004,
      opacity: 0.4 + Math.random() * 0.35,
      size: 1.0 + Math.random() * 1.2,
    });
  }

  function updateSim(st: State) {
    st.tick++;
    if (st.tick % 5 === 0) spawnParticle(st);
    for (let i = st.particles.length - 1; i >= 0; i--) {
      st.particles[i].t += st.particles[i].speed;
      if (st.particles[i].t >= 1) st.particles.splice(i, 1);
    }
    if (st.particles.length > 60) st.particles.splice(0, st.particles.length - 60);
  }

  /* ── Drawing ─────────────────────────────────────────────── */
  function roundRect(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawNode(ctx: CanvasRenderingContext2D, n: Resolved) {
    const w = n.id === "registry" ? 130 : NODE_W;
    const h = NODE_H;
    const r = n.shape === "pill" ? h / 2 : 7;
    const x0 = n.px - w / 2;
    const y0 = n.py - h / 2;

    // Fill
    roundRect(ctx, x0, y0, w, h, r);
    ctx.fillStyle = n.color + "18";
    ctx.fill();

    // Border
    ctx.strokeStyle = n.color;
    ctx.lineWidth = n.id === "mandalay" ? 1.5 : 1;
    ctx.globalAlpha = n.id === "mandalay" ? 0.7 : 0.45;
    roundRect(ctx, x0, y0, w, h, r);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Label
    ctx.globalAlpha = n.id === "more" ? 0.45 : 0.85;
    ctx.font = n.id === "mandalay"
      ? "600 10px var(--font-sans, system-ui)"
      : "500 9px var(--font-mono, monospace)";
    ctx.fillStyle = "#e4e4e7";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.label, n.px, n.py);
    ctx.globalAlpha = 1;
  }

  function drawFrame(ctx: CanvasRenderingContext2D, st: State) {
    const { w, h, dpr } = st;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Edges ──────────────────────────────────────────────
    for (const e of EDGES) {
      const fromN = st.nodeMap.get(e.from);
      const toN = st.nodeMap.get(e.to);
      if (!fromN || !toN) continue;

      const [cx, cy] = edgeCtrl(fromN, toN);
      const ec = e.color || "#475569";

      ctx.beginPath();
      ctx.setLineDash(e.dashed ? [4, 5] : []);
      ctx.strokeStyle = ec;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.moveTo(fromN.px, fromN.py);
      ctx.quadraticCurveTo(cx, cy, toN.px, toN.py);
      ctx.stroke();

      // Arrow head
      const at = 0.92;
      const [ax, ay] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, at);
      const angle = Math.atan2(toN.py - ay, toN.px - ax);
      ctx.globalAlpha = 0.22;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toN.px, toN.py);
      ctx.lineTo(toN.px - 5 * Math.cos(angle - 0.35), toN.py - 5 * Math.sin(angle - 0.35));
      ctx.lineTo(toN.px - 5 * Math.cos(angle + 0.35), toN.py - 5 * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fillStyle = ec;
      ctx.fill();

      // Edge label
      if (e.label) {
        const [lx, ly] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, 0.5);
        ctx.font = "500 7.5px var(--font-mono, monospace)";
        const tm = ctx.measureText(e.label);
        const pw = tm.width + 8;
        const ph = 12;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "rgba(9,9,11,0.85)";
        roundRect(ctx, lx - pw / 2, ly - 3 - ph, pw, ph, 3);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(e.label, lx, ly - 3);
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // ── Particles ──────────────────────────────────────────
    for (const p of st.particles) {
      const e = EDGES[p.edgeIdx];
      if (!e) continue;
      const fromN = st.nodeMap.get(e.from);
      const toN = st.nodeMap.get(e.to);
      if (!fromN || !toN) continue;

      const [cx, cy] = edgeCtrl(fromN, toN);
      // Reverse particles travel to→from
      const t = ease(e.reverse ? 1 - p.t : p.t);
      const [px, py] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, t);
      const pColor = e.color || (e.reverse ? toN.color : fromN.color);

      // Glow
      ctx.beginPath();
      ctx.arc(px, py, p.size * 3.5, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.5);
      grad.addColorStop(0, pColor + "40");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = e.reverse ? pColor : "#e4e4e7";
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Nodes ──────────────────────────────────────────────
    for (const n of st.nodes) drawNode(ctx, n);

    ctx.restore();
  }

  /* ── Lifecycle ──────────────────────────────────────────── */
  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      stateRef.current = buildState(rect.width, rect.height, dpr);
    }

    resize();

    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    window.addEventListener("resize", resize);

    let running = true;
    function loop() {
      if (!running) return;
      frameRef.current = requestAnimationFrame(loop);
      if (!ctx || !stateRef.current || !visibleRef.current) return;
      if (!reducedMotion.current) updateSim(stateRef.current);
      drawFrame(ctx, stateRef.current);
    }
    if (stateRef.current && ctx) drawFrame(ctx, stateRef.current);
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [buildState]);

  return (
    <div className={styles.wrap}>
      <p className={styles.tagline}>
        <strong>One endpoint.</strong> Every provider. Capacity-routed.
      </p>
      <div
        className={styles.container}
        style={{ height: CANVAS_H }}
        role="img"
        aria-label="Flow diagram: Your App sends requests to Mandalay, which routes them to OpenAI, Anthropic, or other providers based on on-chain capacity weights from the Capacity Registry"
      >
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}
