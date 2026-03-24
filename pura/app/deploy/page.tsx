"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import s from "./deploy.module.css";

type AuthState =
  | { status: "unauthenticated" }
  | { status: "authenticating" }
  | { status: "authenticated"; pubkey: string };

interface RelayStatus {
  subdomain: string;
  relay_url: string;
  plan: string;
  relayName: string;
  relayDescription: string;
  storageUsedBytes: number;
  eventCount: number;
  customDomain: string | null;
  superfluidStreamId: string | null;
  createdAt: number;
}

export default function DeployPage() {
  const [auth, setAuth] = useState<AuthState>({ status: "unauthenticated" });
  const [relay, setRelay] = useState<RelayStatus | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const signIn = useCallback(async () => {
    setAuth({ status: "authenticating" });
    setError("");

    try {
      const nostr = (
        window as unknown as {
          nostr?: {
            getPublicKey(): Promise<string>;
            signEvent(e: unknown): Promise<unknown>;
          };
        }
      ).nostr;
      if (!nostr) {
        setError(
          "No Nostr extension found. Install nos2x, Alby, or another NIP-07 extension.",
        );
        setAuth({ status: "unauthenticated" });
        return;
      }

      const challengeRes = await fetch("/api/deploy/auth");
      const { id: challengeId, challenge } = await challengeRes.json();
      const pubkey = await nostr.getPublicKey();

      const event = await nostr.signEvent({
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["challenge", challenge]],
        content: "",
        pubkey,
      });

      const verifyRes = await fetch("/api/deploy/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, event }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || "Auth failed");
        setAuth({ status: "unauthenticated" });
        return;
      }

      const { pubkey: verifiedPubkey } = await verifyRes.json();
      setAuth({ status: "authenticated", pubkey: verifiedPubkey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
      setAuth({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    fetch(`/api/deploy/status?pubkey=${auth.pubkey}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setRelay(data);
      })
      .catch(() => {});
  }, [auth]);

  const provision = useCallback(async () => {
    if (auth.status !== "authenticated") return;
    setProvisioning(true);
    setError("");

    try {
      const res = await fetch("/api/deploy/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey: auth.pubkey, subdomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Provisioning failed");
        return;
      }
      const statusRes = await fetch(
        `/api/deploy/status?pubkey=${auth.pubkey}`,
      );
      if (statusRes.ok) setRelay(await statusRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
  }, [auth, subdomain]);

  // Pre-auth view
  if (auth.status !== "authenticated") {
    return (
      <main className={s.main}>
        <div className={s.head}>
          <span style={{ color: "var(--color-deploy)" }}>── DEPLOY</span>
          <hr className={s.rule} />
        </div>

        <h1 className={s.title}>Deploy a service that earns</h1>
        <p className={s.subtitle}>
          Gateway operators, relay runners, DVM providers. Pick your path.
        </p>

        {/* ── gateway operator ── */}
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            gateway operator
          </div>
          <p style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.6, marginBottom: "0.5rem" }}>
            Run the Pura LLM inference gateway. Route requests across OpenAI,
            Anthropic, Groq, and Gemini. Automatic model selection, budget
            enforcement, cost tracking. Settle incoming payments via Lightning.
          </p>
          <Link href="/gateway" style={{ fontSize: "0.72rem", color: "var(--color-deploy)" }}>
            gateway quick start →
          </Link>
        </section>

        {/* ── pricing model ── */}
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
            how pricing works
          </div>
          <div className={s.plans}>
            <div className={s.planCard}>
              <div className={s.planName}>Shadow mode</div>
              <div className={s.planPrice}>Free</div>
              <ul className={s.planFeatures}>
                <li>Install the <code>@puraxyz/shadow</code> sidecar</li>
                <li>Capacity metrics collected locally</li>
                <li>Simulated BPE allocation reports</li>
                <li>No on-chain registration required</li>
              </ul>
            </div>
            <div className={s.planCard} style={{ borderColor: "var(--color-deploy)" }}>
              <div className={s.planName} style={{ color: "var(--color-deploy)" }}>On-chain</div>
              <div className={s.planPrice}>Usage-based</div>
              <ul className={s.planFeatures}>
                <li>Protocol fees set by PricingCurve</li>
                <li>Congestion-adjusted per task type</li>
                <li>Settlement via Lightning, Superfluid, or ERC-20</li>
                <li>Relay hosting on pura.xyz subdomain</li>
                <li>Payment pool revenue sharing</li>
              </ul>
            </div>
          </div>
          <p style={{ fontSize: "0.68rem", color: "#666", lineHeight: 1.6, marginTop: "0.75rem" }}>
            There are no flat monthly fees. The protocol&apos;s PricingCurve contract
            sets fees dynamically based on network congestion: prices rise when
            capacity is scarce, drop when it&apos;s abundant. Operators earn from
            the payment pool proportional to their verified throughput.
            Start with shadow mode to see projected earnings before registering on-chain.
          </p>
        </section>

        {/* ── DVM deploy link ── */}
        <section style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            deploy a DVM
          </div>
          <p style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.6, marginBottom: "0.5rem" }}>
            Register a NIP-90 Data Vending Machine with capacity monitoring,
            completion verification, and congestion pricing.
          </p>
          <Link href="/deploy/dvm" style={{ fontSize: "0.72rem", color: "var(--color-deploy)" }}>
            register a DVM →
          </Link>
        </section>

        {/* ── relay deploy (sign in) ── */}
        <section>
          <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            deploy a relay
          </div>
          <p style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Get a personal Nostr relay on a pura.xyz subdomain. No email, no
            password.
          </p>
          <div className={s.authBlock}>
            <button
              className={s.btn}
              onClick={signIn}
              disabled={auth.status === "authenticating"}
            >
              {auth.status === "authenticating"
                ? "signing in..."
                : "sign in with nostr →"}
            </button>
            {error && <p className={s.error}>{error}</p>}
          </div>
        </section>
      </main>
    );
  }

  // Post-auth view
  return (
    <main className={s.main}>
      <div className={s.head}>
        <span style={{ color: "var(--color-deploy)" }}>── DEPLOY</span>
        <hr className={s.rule} />
      </div>

      <h1 className={s.title}>Your relay</h1>
      <p className={s.subtitle}>
        signed in as {auth.pubkey.slice(0, 8)}…{auth.pubkey.slice(-4)}
      </p>

      {relay ? (
        <>
          <div className={s.kvGrid}>
            <span className={s.kvLabel}>status</span>
            <span className={s.kvValue}>
              <span style={{ color: "var(--green)" }}>● online</span>
            </span>
            <span className={s.kvLabel}>events</span>
            <span className={s.kvValue}>
              {relay.eventCount.toLocaleString()}
            </span>
            <span className={s.kvLabel}>storage</span>
            <span className={s.kvValue}>
              {(relay.storageUsedBytes / 1024 / 1024).toFixed(1)} MB
            </span>
            <span className={s.kvLabel}>url</span>
            <span className={s.kvValue}>{relay.relay_url}</span>
            <span className={s.kvLabel}>plan</span>
            <span className={s.kvValue}>{relay.plan}</span>
            <span className={s.kvLabel}>name</span>
            <span className={s.kvValue}>{relay.relayName}</span>
            {relay.customDomain && (
              <>
                <span className={s.kvLabel}>domain</span>
                <span className={s.kvValue}>{relay.customDomain}</span>
              </>
            )}
            <span className={s.kvLabel}>created</span>
            <span className={s.kvValue}>
              {new Date(relay.createdAt).toLocaleDateString()}
            </span>
          </div>
        </>
      ) : (
        <div className={s.provisionBlock}>
          <div className={s.subdomainRow}>
            <input
              type="text"
              className={s.input}
              placeholder="yourname"
              value={subdomain}
              onChange={(e) =>
                setSubdomain(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
            />
            <span className={s.suffix}>.pura.xyz</span>
            <button
              className={s.btn}
              onClick={provision}
              disabled={provisioning || subdomain.length < 3}
            >
              {provisioning ? "creating..." : "create relay →"}
            </button>
          </div>
          {error && <p className={s.error}>{error}</p>}
        </div>
      )}
    </main>
  );
}
