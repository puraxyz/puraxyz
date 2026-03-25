import styles from "../page.module.css";
import { KeyGenerator } from "../components/KeyGenerator";

export const metadata = {
  title: "Gateway — Pura",
  description: "Intelligent LLM inference routing across OpenAI, Anthropic, Groq, and Gemini. OpenAI-compatible API.",
};

export default function GatewayPage() {
  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.title}>LLM inference gateway</h1>
        <p className={styles.subtitle}>
          One endpoint, four providers. Pura scores task complexity and routes
          to the best model for the task. You get per-request cost
          headers, daily budget caps, and overnight spend reports. Settlement
          runs on Lightning.
        </p>
      </header>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Get an API key
        </h2>
        <KeyGenerator />
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Quick start
        </h2>
        <pre className={styles.codePre}>{`# Get an API key
curl -X POST https://api.pura.xyz/api/keys \\
  -H "Content-Type: application/json" \\
  -d '{"label":"my-agent"}'

# Send a request (auto model selection)
curl https://api.pura.xyz/api/chat \\
  -H "Authorization: Bearer pura_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hello"}]}'`}</pre>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          OpenAI SDK drop-in
        </h2>
        <pre className={styles.codePre}>{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.pura.xyz/api",
  apiKey: process.env.PURA_API_KEY,
});

const res = await client.chat.completions.create({
  model: "auto",  // Pura picks the best model
  messages: [{ role: "user", content: "Explain backpressure routing." }],
});`}</pre>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Providers
        </h2>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>provider</th>
              <th>model</th>
              <th>tier</th>
              <th>cost per 1K tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Groq</td><td>llama-3.3-70b-versatile</td><td>cheap</td><td>$0.0003</td></tr>
            <tr><td>Gemini</td><td>gemini-2.0-flash</td><td>cheap</td><td>$0.0005</td></tr>
            <tr><td>OpenAI</td><td>gpt-4o</td><td>mid</td><td>$0.005</td></tr>
            <tr><td>Anthropic</td><td>claude-sonnet-4-20250514</td><td>premium</td><td>$0.003</td></tr>
          </tbody>
        </table>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Response headers
        </h2>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>header</th>
              <th>description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>X-Pura-Provider</td><td>Provider that handled the request</td></tr>
            <tr><td>X-Pura-Model</td><td>Model used</td></tr>
            <tr><td>X-Pura-Cost</td><td>Estimated cost in USD</td></tr>
            <tr><td>X-Pura-Tier</td><td>Complexity tier (cheap/mid/premium)</td></tr>
            <tr><td>X-Pura-Budget-Remaining</td><td>Remaining daily budget</td></tr>
          </tbody>
        </table>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Cost report
        </h2>
        <pre className={styles.codePre}>{`curl https://api.pura.xyz/api/report \\
  -H "Authorization: Bearer pura_YOUR_KEY"

# Returns JSON:
# {
#   "period": "24h",
#   "totalSpendUsd": 0.042,
#   "requestCount": 127,
#   "averageCostUsd": 0.00033,
#   "perModel": { "groq": { ... }, "openai": { ... } }
# }`}</pre>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem" }}>
          Lightning wallet
        </h2>
        <p className={styles.desc}>
          The first 5,000 requests are free. After that, fund a Lightning wallet:
        </p>
        <pre className={styles.codePre}>{`# Create a funding invoice (10,000 sats ~ $4)
curl -X POST https://api.pura.xyz/api/wallet/fund \\
  -H "Authorization: Bearer pura_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 10000}'

# Check balance
curl https://api.pura.xyz/api/wallet/balance \\
  -H "Authorization: Bearer pura_YOUR_KEY"`}</pre>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <div className={styles.heroCtas}>
          <a href="/docs/getting-started" className={styles.ctaSecondary}>full documentation →</a>
          <a href="/status" className={styles.ctaSecondary}>provider status →</a>
          <a href="https://github.com/puraxyz/puraxyz" target="_blank" rel="noopener noreferrer" className={styles.ctaSecondary}>github →</a>
          <a href="https://github.com/puraxyz/puraxyz/issues" target="_blank" rel="noopener noreferrer" className={styles.ctaSecondary}>report an issue →</a>
        </div>
      </section>
    </main>
  );
}
