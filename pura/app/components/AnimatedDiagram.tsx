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
  width: number;
  height: number;
  lines: string[];
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

const NODE_FONT = "500 9px var(--font-mono, monospace)";
const NODE_LINE_HEIGHT = 12;
const NODE_MIN_W = 112;
const NODE_MIN_H = 40;
const NODE_MAX_W = 180;
const NODE_X_PAD = 14;
const NODE_Y_PAD = 16;
const NODE_GAP = 18;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createMeasureContext() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = NODE_FONT;
  return ctx;
}

function splitLongToken(
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number,
) {
  const segments: string[] = [];
  let current = "";

  for (const char of token) {
    const next = `${current}${char}`;
    if (current && ctx.measureText(next).width > maxWidth) {
      segments.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) segments.push(current);
  return segments;
}

function wrapLabel(
  ctx: CanvasRenderingContext2D | null,
  label: string,
  maxTextWidth: number,
) {
  const rawLines = label.split("\n");
  if (!ctx) return rawLines;

  const wrapped: string[] = [];
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      wrapped.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxTextWidth) {
        current = candidate;
        continue;
      }

      if (current) wrapped.push(current);
      if (ctx.measureText(word).width <= maxTextWidth) {
        current = word;
        continue;
      }

      const pieces = splitLongToken(ctx, word, maxTextWidth);
      wrapped.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] ?? "";
    }

    if (current) wrapped.push(current);
  }

  return wrapped.length > 0 ? wrapped : rawLines;
}

function measureNode(
  ctx: CanvasRenderingContext2D | null,
  label: string,
  maxTextWidth: number,
) {
  const lines = wrapLabel(ctx, label, maxTextWidth);
  const widest = ctx
    ? lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)
    : NODE_MIN_W - NODE_X_PAD * 2;
  const width = clamp(Math.ceil(widest + NODE_X_PAD * 2), NODE_MIN_W, NODE_MAX_W);
  const height = Math.max(NODE_MIN_H, NODE_Y_PAD + lines.length * NODE_LINE_HEIGHT + 8);
  return { lines, width, height };
}

function clampNode(node: ResolvedNode, w: number, h: number, padX: number, padY: number) {
  node.px = clamp(node.px, padX + node.width / 2, w - padX - node.width / 2);
  node.py = clamp(node.py, padY + node.height / 2, h - padY - node.height / 2);
}

function resolveNodeCollisions(
  nodes: ResolvedNode[],
  w: number,
  h: number,
  padX: number,
  padY: number,
) {
  for (let iteration = 0; iteration < 10; iteration++) {
    let changed = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.px - a.px;
        const dy = b.py - a.py;
        const overlapX = a.width / 2 + b.width / 2 + NODE_GAP - Math.abs(dx);
        const overlapY = a.height / 2 + b.height / 2 + NODE_GAP - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;
        changed = true;

        if (overlapX < overlapY) {
          const direction = dx === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dx);
          const push = overlapX / 2;
          a.px -= direction * push;
          b.px += direction * push;
        } else {
          const direction = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy);
          const push = overlapY / 2;
          a.py -= direction * push;
          b.py += direction * push;
        }

        clampNode(a, w, h, padX, padY);
        clampNode(b, w, h, padX, padY);
      }
    }

    if (!changed) break;
  }
}

/** Point on a node's border where a ray toward (tx, ty) exits. */
function borderPt(n: ResolvedNode, tx: number, ty: number): [number, number] {
  const dx = tx - n.px;
  const dy = ty - n.py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return [n.px, n.py];
  const ux = dx / dist;
  const uy = dy / dist;
  const shape = n.shape || "rect";
  let t: number;
  if (shape === "diamond") {
    const hw = n.width / 2;
    const hh = n.height / 2;
    t = 1 / ((Math.abs(ux) / hw) + (Math.abs(uy) / hh) || 1);
  } else {
    const hw = n.width / 2;
    const hh = n.height / 2;
    const sx = Math.abs(ux) > 0.001 ? hw / Math.abs(ux) : 1e9;
    const sy = Math.abs(uy) > 0.001 ? hh / Math.abs(uy) : 1e9;
    t = Math.min(sx, sy);
  }
  return [n.px + ux * t, n.py + uy * t];
}

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
      const measureCtx = createMeasureContext();
      const maxTextWidth = clamp(w * 0.2, 84, NODE_MAX_W - NODE_X_PAD * 2);
      const nodeMetrics = nodes.map((node) => measureNode(measureCtx, node.label, maxTextWidth));
      const maxNodeWidth = nodeMetrics.reduce((max, node) => Math.max(max, node.width), NODE_MIN_W);
      const maxNodeHeight = nodeMetrics.reduce((max, node) => Math.max(max, node.height), NODE_MIN_H);
      const padX = maxNodeWidth / 2 + 28;
      const padY = maxNodeHeight / 2 + 24;
      const resolved: ResolvedNode[] = nodes.map((n, index) => ({
        ...n,
        ...nodeMetrics[index],
        px: padX + n.x * Math.max(1, w - 2 * padX),
        py: padY + n.y * Math.max(1, h - 2 * padY),
      }));
      for (const node of resolved) clampNode(node, w, h, padX, padY);
      resolveNodeCollisions(resolved, w, h, padX, padY);
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
      const maxNodeWidth = st.nodes.reduce((max, node) => Math.max(max, node.width), NODE_MIN_W);
      const maxNodeHeight = st.nodes.reduce((max, node) => Math.max(max, node.height), NODE_MIN_H);
      const padX = maxNodeWidth / 2 + 28;
      const padY = maxNodeHeight / 2 + 24;
      const mx = maxNodeWidth / 2 + 12;
      const my = maxNodeHeight / 2 + 18;
      const gx = padX + g.x * Math.max(1, w - 2 * padX) - mx;
      const gy = padY + g.y * Math.max(1, h - 2 * padY) - my;
      const gw = g.w * Math.max(1, w - 2 * padX) + 2 * mx;
      const gh = g.h * Math.max(1, h - 2 * padY) + 2 * my;
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

      const [fx, fy] = borderPt(fromN, toN.px, toN.py);
      const [bx, by] = borderPt(toN, fromN.px, fromN.py);
      const [cx, cy] = edgeMidCtrl(st, fromN, toN);
      const ec = e.color || "#475569";

      ctx.beginPath();
      if (e.dashed) ctx.setLineDash([4, 5]);
      else ctx.setLineDash([]);
      ctx.strokeStyle = ec;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();

      // Arrow head
      const at = 0.92;
      const [ax, ay] = bezier2(fx, fy, cx, cy, bx, by, at);
      const angle = Math.atan2(by - ay, bx - ax);
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 6 * Math.cos(angle - 0.35), by - 6 * Math.sin(angle - 0.35));
      ctx.lineTo(bx - 6 * Math.cos(angle + 0.35), by - 6 * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fillStyle = ec;
      ctx.fill();

      // Edge label
      if (e.label) {
        const [lx, ly] = bezier2(fx, fy, cx, cy, bx, by, 0.5);
        ctx.font = "500 8px var(--font-mono, monospace)";
        const tm = ctx.measureText(e.label);
        const pw = tm.width + 8;
        const ph = 13;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "rgba(9,9,11,0.82)";
        roundRect(ctx, lx - pw / 2, ly - 3 - ph, pw, ph, 4);
        ctx.fill();
        ctx.globalAlpha = 0.75;
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

      const [fx, fy] = borderPt(fromN, toN.px, toN.py);
      const [bx, by] = borderPt(toN, fromN.px, fromN.py);
      const [cx, cy] = edgeMidCtrl(st, fromN, toN);
      const t = ease(p.t);
      const [px, py] = bezier2(fx, fy, cx, cy, bx, by, t);
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
    const { px, py, color, shape = "rect", width: w, height: h, lines } = n;

    if (shape === "diamond") {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      const ds = Math.min(w, h) / 1.55;
      roundRect(ctx, -ds / 2, -ds / 2, ds, ds, 4);
      ctx.fillStyle = color + "18";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.restore();

      // Label (unrotated)
      ctx.globalAlpha = 0.85;
      ctx.font = NODE_FONT;
      ctx.fillStyle = "#e4e4e7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], px, py + (i - (lines.length - 1) / 2) * NODE_LINE_HEIGHT);
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

    // Label
    ctx.globalAlpha = 0.85;
    ctx.font = NODE_FONT;
    ctx.fillStyle = "#e4e4e7";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], px, py + (i - (lines.length - 1) / 2) * NODE_LINE_HEIGHT);
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
