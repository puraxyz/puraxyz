import styles from "./FlowChart.module.css";

interface FlowChartProps {
  agents: Record<string, { poolUnits: string }>;
  flowRate: string;
  agentMeta: Record<string, { label: string; color: string }>;
}

export function FlowChart({ agents, flowRate, agentMeta }: FlowChartProps) {
  const totalUnits = Object.values(agents).reduce(
    (sum, a) => sum + Number(a.poolUnits),
    0,
  );

  const agentNames = Object.keys(agents);

  const W = 400;
  const H = 200;
  const srcX = 50;
  const poolX = 200;
  const sinkX = 350;
  const srcY = H / 2;
  const poolY = H / 2;

  const agentYs = agentNames.map(
    (_, i) => 40 + (i * (H - 80)) / Math.max(agentNames.length - 1, 1),
  );

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Payment Flow</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
        {/* Dispatch → Pool */}
        <line
          x1={srcX + 30}
          y1={srcY}
          x2={poolX - 30}
          y2={poolY}
          stroke="#d97706"
          strokeWidth={2}
          strokeDasharray="6 3"
          className={styles.flowLine}
        />

        {/* Pool → Agents */}
        {agentNames.map((name, i) => {
          const units = Number(agents[name].poolUnits);
          const share = totalUnits > 0 ? units / totalUnits : 1 / agentNames.length;
          const thickness = Math.max(1, share * 6);
          const color = agentMeta[name]?.color ?? "#a1a1aa";

          return (
            <line
              key={name}
              x1={poolX + 30}
              y1={poolY}
              x2={sinkX - 30}
              y2={agentYs[i]}
              stroke={color}
              strokeWidth={thickness}
              strokeDasharray="6 3"
              className={styles.flowLine}
              opacity={0.7}
            />
          );
        })}

        {/* Dispatch node */}
        <circle cx={srcX} cy={srcY} r={22} fill="#18181b" stroke="#d97706" strokeWidth={1.5} />
        <text x={srcX} y={srcY + 4} textAnchor="middle" fill="#d97706" fontSize={9} fontWeight={600}>
          DSP
        </text>

        {/* Pool node */}
        <rect x={poolX - 24} y={poolY - 18} width={48} height={36} rx={6} fill="#18181b" stroke="#a1a1aa" strokeWidth={1.5} />
        <text x={poolX} y={poolY + 4} textAnchor="middle" fill="#e4e4e7" fontSize={9} fontWeight={600}>
          POOL
        </text>

        {/* Agent nodes */}
        {agentNames.map((name, i) => {
          const color = agentMeta[name]?.color ?? "#a1a1aa";
          const label = agentMeta[name]?.label ?? name;

          return (
            <g key={name}>
              <circle cx={sinkX} cy={agentYs[i]} r={18} fill="#18181b" stroke={color} strokeWidth={1.5} />
              <text x={sinkX} y={agentYs[i] + 3.5} textAnchor="middle" fill={color} fontSize={8} fontWeight={600}>
                {label.slice(0, 3).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
