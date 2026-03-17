"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./AnimatedDiagram.module.css";

/* ── Public types ──────────────────────────────────────────────── */

export interface DiagramNode {
  id: string;
  label: string;            // supports \n for multiline
  x: number;                // 0-1 relative
  y: number;                // 0-1 relative
  color: string;
  shape?: "rect" | "diamond" | "pill";
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  color?: string;            // defaults to #475569
}

export interface DiagramGroup {
  id: string;
  label: string;
  x: number; y: number;     // top-left corner (0-1)
  w: number; h: number;     // size (0-1)
  color?: string;
}

export interface DiagramProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  height?: number;          // CSS px, default 280
  direction?: "LR" | "TB"; // hint for edge curvature
  ariaLabel?: string;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

interface Particle {
  t: number;
  edgeIdx: number;
  speed: number;
  opacity: number;
  size: number;
}

interface ResolvedNode extends DiagramNode {
  px: number; py: number;   // absolute pixel positions
}

interface InternalState {
  nodes: ResolvedNode[];
  nodeMap: Map<string, ResolvedNode>;
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  particles: Particle[];
  w: number; h: number; dpr: number;
  tick: number;
  direction: "LR" | "TB";
}

const NODE_W = 120;
const NODE_H = 40;
const PAD = 40;

/* ── Component ─────────────────────────────────────────────────── */

export default function AnimatedDiagram({
  nodes, edges, groups = [], height = 280, direction = "LR", ariaLabel,
}: DiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<InternalState | null>(null);
  const visibleRef = useRef(true);
  const reducedMotion = useRef(false);

  const buildState = useCallback(
    (w: number, h: number, dpr: number): InternalState => {
      const resolved: ResolvedNode[] = nodes.map((n) => ({
        ...n,
        px: PAD + n.x * (w - 2 * PAD),
        py: PAD + n.y * (h - 2 * PAD),
      }));
      const nodeMap = new Map<string, ResolvedNode>();
      for (const n of resolved) nodeMap.set(n.id, n);
      return { nodes: resolved, nodeMap, edges, groups, particles: [], w, h, dpr, tick: 0, direction };
    },
    [nodes, edges, groups, direction],
  );

  /* ── Bezier for edge path ──────────────────────────────── */

  function edgeMidCtrl(st: InternalState, fromN: ResolvedNode, toN: ResolvedNode): [number, number] {
    if (st.direction === "LR") {
      return [lerp(fromN.px, toN.px, 0.5), lerp(fromN.py, toN.py, 0.35)];
    }
    return [lerp(fromN.px, toN.px, 0.35), lerp(fromN.py, toN.py, 0.5)];
  }

  function bezier2(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, t: number): [number, number] {
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
  }

  /* ── Spawn / update ──────────────────────────────────────── */

  function spawnParticle(st: InternalState) {
    if (st.edges.length === 0) return;
    const edgeIdx = Math.floor(Math.random() * st.edges.length);
    st.particles.push({
      t: 0,
      edgeIdx,
      speed: 0.006 + Math.random() * 0.006,
      opacity: 0.45 + Math.random() * 0.35,
      size: 1.2 + Math.random() * 1.2,
    });
  }

  function updateSim(st: InternalState) {
    st.tick++;
    const rate = st.edges.length > 8 ? 4 : st.edges.length > 4 ? 3 : 2;
    if (st.tick % rate === 0) spawnParticle(st);

    for (let i = st.particles.length - 1; i >= 0; i--) {
      st.particles[i].t += st.particles[i].speed;
      if (st.particles[i].t >= 1) st.particles.splice(i, 1);
    }
    // Cap particle count
    if (st.particles.length > 80) st.particles.splice(0, st.particles.length - 80);
  }

  /* ── Draw ────────────────────────────────────────────────── */

  function drawFrame(ctx: CanvasRenderingContext2D, st: InternalState) {
    const { w, h, dpr } = st;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Groups / subgraphs ──────────────────────────────────
    for (const g of st.groups) {
      const gx = PAD + g.x * (w - 2 * PAD) - 12;
      const gy = PAD + g.y * (h - 2 * PAD) - 24;
      const gw = g.w * (w - 2 * PAD) + 24;
      const gh = g.h * (h - 2 * PAD) + 36;
      const gc = g.color || "#334155";

      ctx.globalAlpha = 0.08;
      ctx.fillStyle = gc;
      roundRect(ctx, gx, gy, gw, gh, 10);
      ctx.fill();

      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = gc;
      ctx.lineWidth = 1;
      roundRect(ctx, gx, gy, gw, gh, 10);
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.font = "600 9px var(--font-mono, monospace)";
      ctx.fillStyle = gc;
      ctx.textAlign = "left";
      ctx.fillText(g.label, gx + 10, gy + 12);
    }
    ctx.globalAlpha = 1;

    // ── Edges ───────────────────────────────────────────────
    for (const e of st.edges) {
      const fromN = st.nodeMap.get(e.from);
      const toN = st.nodeMap.get(e.to);
      if (!fromN || !toN) continue;

      const [cx, cy] = edgeMidCtrl(st, fromN, toN);
      const ec = e.color || "#475569";

      ctx.beginPath();
      if (e.dashed) ctx.setLineDash([4, 5]);
      else ctx.setLineDash([]);
      ctx.strokeStyle = ec;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.moveTo(fromN.px, fromN.py);
      ctx.quadraticCurveTo(cx, cy, toN.px, toN.py);
      ctx.stroke();

      // Arrow head
      const at = 0.92;
      const [ax, ay] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, at);
      const angle = Math.atan2(toN.py - ay, toN.px - ax);
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toN.px, toN.py);
      ctx.lineTo(toN.px - 6 * Math.cos(angle - 0.35), toN.py - 6 * Math.sin(angle - 0.35));
      ctx.lineTo(toN.px - 6 * Math.cos(angle + 0.35), toN.py - 6 * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fillStyle = ec;
      ctx.fill();

      // Edge label
      if (e.label) {
        const [lx, ly] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, 0.5);
        ctx.globalAlpha = 0.55;
        ctx.font = "500 8px var(--font-mono, monospace)";
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(e.label, lx, ly - 3);
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // ── Particles ───────────────────────────────────────────
    for (const p of st.particles) {
      const e = st.edges[p.edgeIdx];
      if (!e) continue;
      const fromN = st.nodeMap.get(e.from);
      const toN = st.nodeMap.get(e.to);
      if (!fromN || !toN) continue;

      const [cx, cy] = edgeMidCtrl(st, fromN, toN);
      const t = ease(p.t);
      const [px, py] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, t);
      const pColor = e.color || fromN.color;

      // Glow
      ctx.beginPath();
      ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
      grad.addColorStop(0, pColor + "40");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "#e4e4e7";
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Nodes ───────────────────────────────────────────────
    for (const n of st.nodes) {
      drawNode(ctx, n);
    }

    ctx.restore();
  }

  function drawNode(ctx: CanvasRenderingContext2D, n: ResolvedNode) {
    const { px, py, label, color, shape = "rect" } = n;
    const lines = label.split("\n");
    const h = Math.max(NODE_H, 14 + lines.length * 13);
    const w = NODE_W;

    if (shape === "diamond") {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      const ds = 22;
      roundRect(ctx, -ds, -ds, ds * 2, ds * 2, 4);
      ctx.fillStyle = color + "18";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.restore();

      // Label (unrotated)
      ctx.globalAlpha = 0.85;
      ctx.font = "500 9px var(--font-mono, monospace)";
      ctx.fillStyle = "#e4e4e7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], px, py + (i - (lines.length - 1) / 2) * 12);
      }
      ctx.globalAlpha = 1;
      return;
    }

    const r = shape === "pill" ? h / 2 : 8;
    const x0 = px - w / 2;
    const y0 = py - h / 2;

    // Fill
    ctx.globalAlpha = 1;
    roundRect(ctx, x0, y0, w, h, r);
    ctx.fillStyle = color + "18";
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    roundRect(ctx, x0, y0, w, h, r);
    ctx.stroke();

    // Dot
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Label
    ctx.globalAlpha = 0.85;
    ctx.font = "500 9px var(--font-mono, monospace)";
    ctx.fillStyle = "#e4e4e7";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], px, py + (i - (lines.length - 1) / 2) * 12);
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

    // IntersectionObserver: only animate when visible
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    let running = true;
    function loop() {
      if (!running || !ctx || !stateRef.current) return;
      if (visibleRef.current) {
        if (!reducedMotion.current) updateSim(stateRef.current);
        drawFrame(ctx, stateRef.current);
      }
      frameRef.current = requestAnimationFrame(loop);
    }
    // Draw once even if reduced motion (static diagram)
    if (stateRef.current) drawFrame(ctx, stateRef.current);
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [buildState]);

  return (
    <div
      className={styles.container}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
