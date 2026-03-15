"use client";

import { useEffect, useRef, useId } from "react";

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "m");

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((m) => {
      if (cancelled) return;
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1e3a5f",
          primaryTextColor: "#e0e0e0",
          primaryBorderColor: "#3b82f6",
          lineColor: "#444",
          secondaryColor: "#1a1a1a",
          tertiaryColor: "#141414",
          fontFamily:
            "var(--font-geist-mono), JetBrains Mono, Fira Code, monospace",
          fontSize: "14px",
        },
      });
      m.default.render(`mermaid-${id}`, chart).then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return <div ref={ref} style={{ margin: "1.5rem 0", textAlign: "center" }} />;
}
