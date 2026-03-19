"use client";

import { useEffect, useRef } from "react";
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
  { id: "mandalay",  label: "\u25C6  Mandalay",  x: 0.46, y: 0.42, color: "#d97706", shape: "rect" },
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
  reverse?: boolean;
}

const EDGES: EdgeDef[] = [
  { from: "app",       to: "mandalay",  label: "request" },
  { from: "mandalay",  to: "openai",    label: "route" },
  { from: "mandalay",  to: "anthropic", label: "route" },
  { from: "mandalay",  to: "more",      label: "route",    dashed: true },
  { from: "registry",  to: "mandalay",  label: "on-chain weights", dashed: true, color: "#d9770660" },
  { from: "openai",    to: "registry",  color: "#22c55e", reverse: true },
  { from: "anthropic", to: "registry",  color: "#8b5cf6", reverse: true },
];

/* ── Helpers ───────────────────────────────────────────────────── */
/** Safely apply a 2-digit hex alpha to a #RRGGBB or #RRGGBBAA color */
function hexAlpha(hex: string, alpha: string) {
  return hex.slice(0, 7) + alpha;
}
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

/* ── Component ─────────────────────────────────────────────────── */
export default function FlowDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    // Non-null alias — TS can't narrow across nested closures
    const canvas: HTMLCanvasElement = canvasEl;

    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── Local mutable state (no refs, no deps) ───────────── */
    let nodes: Resolved[] = [];
    let nodeMap = new Map<string, Resolved>();
    let particles: Particle[] = [];
    let tick = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let running = true;
    let visible = true;
    let raf = 0;

    /* ── Resolve node positions for current size ──────────── */
    function resolve(cw: number, ch: number, cdpr: number) {
      w = cw; h = ch; dpr = cdpr;
      nodes = NODES.map((n) => ({
        id: n.id, label: n.label, color: n.color, shape: n.shape,
        px: PAD_X + n.x * (cw - 2 * PAD_X),
        py: PAD_Y + n.y * (ch - 2 * PAD_Y),
      }));
      nodeMap = new Map<string, Resolved>();
      for (const n of nodes) nodeMap.set(n.id, n);
    }

    /* ── Edge path control point ──────────────────────────── */
    function edgeCtrl(fromN: Resolved, toN: Resolved): [number, number] {
      return [lerp(fromN.px, toN.px, 0.5), lerp(fromN.py, toN.py, 0.3)];
    }

    /* ── Simulation ───────────────────────────────────────── */
    function spawnParticle() {
      const edgeIdx = Math.floor(Math.random() * EDGES.length);
      particles.push({
        t: 0, edgeIdx,
        speed: 0.004 + Math.random() * 0.004,
        opacity: 0.4 + Math.random() * 0.35,
        size: 1.0 + Math.random() * 1.2,
      });
    }

    function updateSim() {
      tick++;
      if (tick % 5 === 0) spawnParticle();
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].t += particles[i].speed;
        if (particles[i].t >= 1) particles.splice(i, 1);
      }
      if (particles.length > 60) particles.splice(0, particles.length - 60);
    }

    /* ── Drawing helpers ──────────────────────────────────── */
    function roundRect(
      x: number, y: number, rw: number, rh: number, r: number,
    ) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y);
      ctx!.lineTo(x + rw - r, y);
      ctx!.arcTo(x + rw, y, x + rw, y + r, r);
      ctx!.lineTo(x + rw, y + rh - r);
      ctx!.arcTo(x + rw, y + rh, x + rw - r, y + rh, r);
      ctx!.lineTo(x + r, y + rh);
      ctx!.arcTo(x, y + rh, x, y + rh - r, r);
      ctx!.lineTo(x, y + r);
      ctx!.arcTo(x, y, x + r, y, r);
      ctx!.closePath();
    }

    function drawNode(n: Resolved) {
      const nw = n.id === "registry" ? 130 : NODE_W;
      const nh = NODE_H;
      const r = n.shape === "pill" ? nh / 2 : 7;
      const x0 = n.px - nw / 2;
      const y0 = n.py - nh / 2;
      roundRect(x0, y0, nw, nh, r);
      ctx!.fillStyle = hexAlpha(n.color, "18");
      ctx!.fill();
      ctx!.strokeStyle = n.color;
      ctx!.lineWidth = n.id === "mandalay" ? 1.5 : 1;
      ctx!.globalAlpha = n.id === "mandalay" ? 0.7 : 0.45;
      roundRect(x0, y0, nw, nh, r);
      ctx!.stroke();
      ctx!.globalAlpha = n.id === "more" ? 0.45 : 0.85;
      ctx!.font = n.id === "mandalay"
        ? "600 10px var(--font-sans, system-ui)"
        : "500 9px var(--font-mono, monospace)";
      ctx!.fillStyle = "#e4e4e7";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(n.label, n.px, n.py);
      ctx!.globalAlpha = 1;
    }

    /* ── Main draw ────────────────────────────────────────── */
    function draw() {
      ctx!.clearRect(0, 0, w * dpr, h * dpr);
      ctx!.save();
      ctx!.scale(dpr, dpr);

      // Edges
      for (const e of EDGES) {
        const fromN = nodeMap.get(e.from);
        const toN = nodeMap.get(e.to);
        if (!fromN || !toN) continue;
        const [cx, cy] = edgeCtrl(fromN, toN);
        const ec = e.color || "#475569";
        ctx!.beginPath();
        ctx!.setLineDash(e.dashed ? [4, 5] : []);
        ctx!.strokeStyle = ec;
        ctx!.globalAlpha = 0.16;
        ctx!.lineWidth = 1;
        ctx!.moveTo(fromN.px, fromN.py);
        ctx!.quadraticCurveTo(cx, cy, toN.px, toN.py);
        ctx!.stroke();
        // Arrow
        const [, ay2] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, 0.92);
        const angle = Math.atan2(toN.py - ay2, toN.px - (bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, 0.92))[0]);
        ctx!.globalAlpha = 0.22;
        ctx!.setLineDash([]);
        ctx!.beginPath();
        ctx!.moveTo(toN.px, toN.py);
        ctx!.lineTo(toN.px - 5 * Math.cos(angle - 0.35), toN.py - 5 * Math.sin(angle - 0.35));
        ctx!.lineTo(toN.px - 5 * Math.cos(angle + 0.35), toN.py - 5 * Math.sin(angle + 0.35));
        ctx!.closePath();
        ctx!.fillStyle = ec;
        ctx!.fill();
        // Label
        if (e.label) {
          const [lx, ly] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, 0.5);
          ctx!.font = "500 7.5px var(--font-mono, monospace)";
          const tm = ctx!.measureText(e.label);
          const pw = tm.width + 8;
          const ph = 12;
          ctx!.globalAlpha = 0.8;
          ctx!.fillStyle = "rgba(9,9,11,0.85)";
          roundRect(lx - pw / 2, ly - 3 - ph, pw, ph, 3);
          ctx!.fill();
          ctx!.globalAlpha = 0.6;
          ctx!.fillStyle = "#a1a1aa";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "bottom";
          ctx!.fillText(e.label, lx, ly - 3);
        }
      }
      ctx!.setLineDash([]);
      ctx!.globalAlpha = 1;

      // Particles
      for (const p of particles) {
        const e = EDGES[p.edgeIdx];
        if (!e) continue;
        const fromN = nodeMap.get(e.from);
        const toN = nodeMap.get(e.to);
        if (!fromN || !toN) continue;
        const [cx, cy] = edgeCtrl(fromN, toN);
        const pt = ease(e.reverse ? 1 - p.t : p.t);
        const [px, py] = bezier2(fromN.px, fromN.py, cx, cy, toN.px, toN.py, pt);
        const pColor = e.color || (e.reverse ? toN.color : fromN.color);
        ctx!.beginPath();
        ctx!.arc(px, py, p.size * 3.5, 0, Math.PI * 2);
        const grad = ctx!.createRadialGradient(px, py, 0, px, py, p.size * 3.5);
        grad.addColorStop(0, hexAlpha(pColor, "40"));
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = e.reverse ? pColor : "#e4e4e7";
        ctx!.globalAlpha = p.opacity;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Nodes
      for (const n of nodes) drawNode(n);
      ctx!.restore();
    }

    /* ── Resize via ResizeObserver (dimension-change guard) ── */
    function handleResize() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      const newW = Math.round(rect.width * newDpr);
      const newH = Math.round(rect.height * newDpr);
      if (canvas.width === newW && canvas.height === newH) return;
      canvas.width = newW;
      canvas.height = newH;
      resolve(rect.width, rect.height, newDpr);
    }

    handleResize();
    draw(); // immediate first paint

    const ro = new ResizeObserver(() => {
      handleResize();
      draw();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (visible && !prefersReduced) updateSim();
      draw();
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
