"use client";

import AnimatedDiagram from "./AnimatedDiagram";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "./AnimatedDiagram";

const NODES: DiagramNode[] = [
  { id: "gateway",    label: "Gateway\nAPI",       x: 0.50, y: 0.10, color: "#f97316", shape: "rect" },
  { id: "openclaw",   label: "OpenClaw\nSkill",    x: 0.20, y: 0.10, color: "#22d3ee", shape: "pill" },
  { id: "lightning",  label: "Lightning\nSettle",   x: 0.80, y: 0.10, color: "#fbbf24", shape: "diamond" },
  { id: "contracts",  label: "Smart\nContracts",   x: 0.50, y: 0.55, color: "#a78bfa", shape: "rect" },
  { id: "dashboard",  label: "Dashboard",          x: 0.82, y: 0.55, color: "#4ade80", shape: "rect" },
  { id: "bitrecipes", label: "bit.recipes",        x: 0.18, y: 0.55, color: "#f87171", shape: "pill" },
  { id: "vrdev",      label: "vr.dev",             x: 0.18, y: 0.90, color: "#f87171", shape: "pill" },
  { id: "nostr",      label: "Nostr\nRelays",      x: 0.82, y: 0.90, color: "#a78bfa", shape: "rect" },
  { id: "base",       label: "Base L2",            x: 0.50, y: 0.90, color: "#3b82f6", shape: "rect" },
];

const EDGES: DiagramEdge[] = [
  { from: "openclaw",   to: "gateway",    color: "#22d3ee" },
  { from: "gateway",    to: "lightning",   color: "#fbbf24" },
  { from: "gateway",    to: "contracts",   color: "#f97316" },
  { from: "gateway",    to: "dashboard",   color: "#4ade80", dashed: true },
  { from: "bitrecipes", to: "gateway",     color: "#f87171" },
  { from: "contracts",  to: "base",        color: "#a78bfa" },
  { from: "contracts",  to: "nostr",       color: "#a78bfa", dashed: true },
  { from: "vrdev",      to: "contracts",   color: "#f87171", dashed: true },
  { from: "lightning",  to: "contracts",   color: "#fbbf24", dashed: true },
];

const GROUPS: DiagramGroup[] = [
  { id: "onchain",  label: "ON-CHAIN",  x: 0.38, y: 0.55, w: 0.24, h: 0.42, color: "#a78bfa" },
  { id: "offchain", label: "OFF-CHAIN", x: 0.08, y: 0.02, w: 0.84, h: 0.28, color: "#808090" },
];

export default function ProductGraph() {
  return (
    <AnimatedDiagram
      nodes={NODES}
      edges={EDGES}
      groups={GROUPS}
      height={340}
      direction="TB"
      ariaLabel="Pura product ecosystem: how Gateway, OpenClaw, Lightning, contracts, and tools interact"
    />
  );
}
