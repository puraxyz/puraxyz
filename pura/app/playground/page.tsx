import PlaygroundHero from "../components/PlaygroundHero";
import styles from "./playground.module.css";

export const metadata = {
  title: "Playground — Pura",
  description:
    "Interactive simulation of backpressure payment routing. Adjust agent count and demand to see how payments reroute around capacity constraints.",
};

export default function PlaygroundPage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Playground</h1>
        <p className={styles.subtitle}>
          Adjust the sliders to see how backpressure routing responds to
          changing demand and agent availability. Payments flow to agents with
          spare capacity. Overloaded agents trigger rerouting. Saturated
          networks push overflow to escrow.
        </p>
      </div>

      <div className={styles.canvasWrap}>
        <PlaygroundHero />
      </div>

      <div className={styles.explanations}>
        <div className={styles.explainCard}>
          <h3 className={styles.explainTitle}>Agents slider</h3>
          <p className={styles.explainText}>
            Controls the number of active agents in the pool. Fewer agents
            means each one receives more traffic and hits capacity faster.
            Watch rerouting increase as you reduce agent count under high
            demand.
          </p>
        </div>
        <div className={styles.explainCard}>
          <h3 className={styles.explainTitle}>Demand slider</h3>
          <p className={styles.explainText}>
            Controls how fast payment requests arrive. At 100%, requests
            arrive every frame. At low demand, agents drain their capacity
            between requests. Push demand high with few agents to see escrow
            activate.
          </p>
        </div>
        <div className={styles.explainCard}>
          <h3 className={styles.explainTitle}>What the numbers mean</h3>
          <p className={styles.explainText}>
            <strong>Routed</strong> counts payments that reached an
            agent. <strong>Rerouted</strong> counts payments that changed
            target mid-flight because the original agent was over 85%
            capacity. <strong>Escrowed</strong> counts payments sent to the
            escrow buffer because all agents were saturated.
          </p>
        </div>
      </div>

      <div className={styles.cta}>
        <p className={styles.ctaText}>
          The real protocol runs on Base Sepolia with 32 deployed contracts.
          This simulation uses the same routing logic: payments flow
          proportional to spare capacity, verified by dual-signed completion
          receipts.
        </p>
        <div className={styles.ctaLinks}>
          <a href="/explainer" className={styles.link}>How it works</a>
          <a href="/docs/getting-started" className={styles.link}>Get started</a>
          <a
            href="https://github.com/puraxyz/puraxyz"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
