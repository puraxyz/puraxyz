"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./AnimatedDiagram.module.css";

/* ── Public types ──────────────────────────────────────────────── */

export interface Participant {
  id: string;
  label: string;
  color: string;
}

export interface SeqMessage {
  from: string;
  to: string;
  label: string;
  self?: boolean;          // self-message (loop)
}

export interface SeqNote {
  over: string;            // participant id
  text: string;
}

export interface SequenceProps {
  participants: Participant[];
  messages: SeqMessage[];
  notes?: SeqNote[];
  height?: number;
  ariaLabel?: string;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

interface Arrow {
  fromX: number; toX: number;
  y: number;
  color: string;
  label: string;
  self: boolean;
}

interface Particle {
  t: number;
  arrowIdx: number;
  speed: number;
  opacity: number;
  size: number;
}

interface InternalState {
  partPositions: { id: string; x: number; color: string; label: string }[];
  arrows: Arrow[];
  note?: { x: number; y: number; text: string };
  particles: Particle[];
  w: number; h: number; dpr: number;
  tick: number;
  topY: number;
  bottomY: number;
  rowH: number;
}

const BOX_W = 100;
const BOX_H = 30;
const PAD_X = 30;
const PAD_TOP = 16;
const ROW_START = 60;

/* ── Component ─────────────────────────────────────────────────── */

export default function AnimatedSequence({
  participants, messages, notes, height = 300, ariaLabel,
}: SequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<InternalState | null>(null);
  const visibleRef = useRef(true);
  const reducedMotion = useRef(false);

  const buildState = useCallback(
    (w: number, h: number, dpr: number): InternalState => {
      const n = participants.length;
      const spacing = (w - 2 * PAD_X) / Math.max(n - 1, 1);

      const partPositions = participants.map((p, i) => ({
        id: p.id,
        x: PAD_X + i * spacing,
        color: p.color,
        label: p.label,
      }));
      const idToX = new Map(partPositions.map((p) => [p.id, p.x]));

      const rowH = Math.min(28, (h - ROW_START - 30) / Math.max(messages.length, 1));
      const arrows: Arrow[] = messages.map((m, i) => {
        const fromX = idToX.get(m.from) ?? 0;
        const toX = idToX.get(m.to) ?? 0;
        const fromP = partPositions.find((p) => p.id === m.from);
        return {
          fromX, toX,
          y: ROW_START + (i + 0.5) * rowH,
          color: fromP?.color || "#475569",
          label: m.label,
          self: !!m.self,
        };
      });

      let noteResolved: InternalState["note"];
      if (notes && notes.length > 0) {
        const last = notes[notes.length - 1];
        const nx = idToX.get(last.over) ?? w / 2;
        noteResolved = { x: nx, y: ROW_START + messages.length * rowH + 6, text: last.text };
      }

      return {
        partPositions, arrows, note: noteResolved,
        particles: [], w, h, dpr, tick: 0,
        topY: PAD_TOP + BOX_H,
        bottomY: h - 8,
        rowH,
      };
    },
    [participants, messages, notes],
  );

  /* ── Spawn / update ──────────────────────────────────────── */

  function spawnParticle(st: InternalState) {
    if (st.arrows.length === 0) return;
    const arrowIdx = Math.floor(Math.random() * st.arrows.length);
    st.particles.push({
      t: 0,
      arrowIdx,
      speed: 0.01 + Math.random() * 0.008,
      opacity: 0.5 + Math.random() * 0.35,
      size: 1.2 + Math.random() * 1.0,
    });
  }

  function updateSim(st: InternalState) {
    st.tick++;
    if (st.tick % 3 === 0) spawnParticle(st);
    for (let i = st.particles.length - 1; i >= 0; i--) {
      st.particles[i].t += st.particles[i].speed;
      if (st.particles[i].t >= 1) st.particles.splice(i, 1);
    }
    if (st.particles.length > 60) st.particles.splice(0, st.particles.length - 60);
  }

  /* ── Draw ────────────────────────────────────────────────── */

  function drawFrame(ctx: CanvasRenderingContext2D, st: InternalState) {
    const { w, h, dpr } = st;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Participant boxes + lifelines ───────────────────────
    for (const p of st.partPositions) {
      // Lifeline
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, st.topY);
      ctx.lineTo(p.x, st.bottomY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Box
      const bx = p.x - BOX_W / 2;
      const by = PAD_TOP;
      ctx.globalAlpha = 1;
      roundRect(ctx, bx, by, BOX_W, BOX_H, 6);
      ctx.fillStyle = p.color + "18";
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.55;
      roundRect(ctx, bx, by, BOX_W, BOX_H, 6);
      ctx.stroke();

      // Label
      ctx.globalAlpha = 0.85;
      ctx.font = "500 9px var(--font-mono, monospace)";
      ctx.fillStyle = "#e4e4e7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x, by + BOX_H / 2);
    }
    ctx.globalAlpha = 1;

    // ── Arrows ──────────────────────────────────────────────
    for (const a of st.arrows) {
      if (a.self) {
        // Self-loop
        const loopW = 30;
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.fromX, a.y);
        ctx.lineTo(a.fromX + loopW, a.y);
        ctx.lineTo(a.fromX + loopW, a.y + 14);
        ctx.lineTo(a.fromX + 4, a.y + 14);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(a.fromX + 4, a.y + 14);
        ctx.lineTo(a.fromX + 9, a.y + 11);
        ctx.lineTo(a.fromX + 9, a.y + 17);
        ctx.closePath();
        ctx.fillStyle = a.color;
        ctx.fill();
        // Label
        ctx.font = "500 7.5px var(--font-mono, monospace)";
        const stm = ctx.measureText(a.label);
        const spw = stm.width + 6;
        const sph = 12;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "rgba(9,9,11,0.82)";
        roundRect(ctx, a.fromX + loopW + 2, a.y + 4 - sph, spw, sph, 3);
        ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(a.label, a.fromX + loopW + 4, a.y + 4);
      } else {
        const dir = a.toX > a.fromX ? 1 : -1;
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.fromX, a.y);
        ctx.lineTo(a.toX, a.y);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(a.toX, a.y);
        ctx.lineTo(a.toX - dir * 6, a.y - 3.5);
        ctx.lineTo(a.toX - dir * 6, a.y + 3.5);
        ctx.closePath();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = a.color;
        ctx.fill();
        // Label
        const lx = (a.fromX + a.toX) / 2;
        ctx.font = "500 7.5px var(--font-mono, monospace)";
        const ltm = ctx.measureText(a.label);
        const lpw = ltm.width + 6;
        const lph = 12;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "rgba(9,9,11,0.82)";
        roundRect(ctx, lx - lpw / 2, a.y - 4 - lph, lpw, lph, 3);
        ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(a.label, lx, a.y - 4);
      }
    }
    ctx.globalAlpha = 1;

    // ── Note box ────────────────────────────────────────────
    if (st.note) {
      const nw = 200;
      const nh = 28;
      const nx = st.note.x - nw / 2;
      const ny = st.note.y;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#d97706";
      roundRect(ctx, nx, ny, nw, nh, 5);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1;
      roundRect(ctx, nx, ny, nw, nh, 5);
      ctx.stroke();
      ctx.globalAlpha = 0.65;
      ctx.font = "500 7.5px var(--font-mono, monospace)";
      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Wrap text if needed
      const words = st.note.text.split("\n");
      for (let i = 0; i < words.length; i++) {
        ctx.fillText(words[i], st.note.x, ny + nh / 2 + (i - (words.length - 1) / 2) * 10);
      }
    }

    // ── Particles ───────────────────────────────────────────
    for (const p of st.particles) {
      const a = st.arrows[p.arrowIdx];
      if (!a) continue;
      const t = ease(p.t);
      let px: number, py: number;
      if (a.self) {
        const loopW = 30;
        if (t < 0.33) { px = lerp(a.fromX, a.fromX + loopW, t / 0.33); py = a.y; }
        else if (t < 0.66) { px = a.fromX + loopW; py = lerp(a.y, a.y + 14, (t - 0.33) / 0.33); }
        else { px = lerp(a.fromX + loopW, a.fromX + 4, (t - 0.66) / 0.34); py = a.y + 14; }
      } else {
        px = lerp(a.fromX, a.toX, t);
        py = a.y;
      }
      const pColor = a.color;

      ctx.beginPath();
      ctx.arc(px, py, p.size * 3.5, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.5);
      grad.addColorStop(0, pColor + "40");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "#e4e4e7";
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
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
