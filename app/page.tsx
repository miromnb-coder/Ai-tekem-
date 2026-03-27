"use client";

import { useState } from "react";

type Blueprint = {
  title: string;
  description: string;
  mode: string;
  hud: {
    direction: "left" | "right" | "up" | "down";
    distance: number;
    label: string;
  };
  features: string[];
  actions: string[];
  status: string;
};

const emptyBlueprint: Blueprint = {
  title: "Ready",
  description: "Describe the app you want to build.",
  mode: "idle",
  hud: { direction: "up", distance: 0, label: "Waiting" },
  features: [],
  actions: [],
  status: "idle",
};

export default function Page() {
  const [prompt, setPrompt] = useState(
    "make a navigation app that shows a direction arrow and distance"
  );
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint>(emptyBlueprint);
  const [error, setError] = useState<string>("");

  async function build() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Build failed");
      }

      setBlueprint(data.blueprint ?? emptyBlueprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.kicker}>HALO AI APP BUILDER</p>
          <h1 style={styles.title}>Build apps from prompts</h1>
          <p style={styles.subtext}>
            Type what you want, press build, and get a structured app blueprint.
          </p>
        </div>

        <div style={styles.pill}>
          <span style={styles.dot} />
          {loading ? "Building..." : "Ready"}
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Prompt</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={styles.textarea}
            placeholder="Describe your app..."
          />
          <button onClick={build} style={styles.button}>
            {loading ? "Building..." : "Build app"}
          </button>
          {error ? <p style={styles.error}>{error}</p> : null}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Generated blueprint</h2>
          <div style={styles.blueprintTop}>
            <div>
              <p style={styles.label}>Title</p>
              <p style={styles.value}>{blueprint.title}</p>
            </div>
            <div>
              <p style={styles.label}>Mode</p>
              <p style={styles.value}>{blueprint.mode}</p>
            </div>
          </div>

          <div style={styles.hudBox}>
            <p style={styles.label}>HUD</p>
            <div style={styles.hudRow}>
              <span style={styles.arrow}>{blueprint.hud.direction}</span>
              <span style={styles.distance}>{blueprint.hud.distance}m</span>
            </div>
            <p style={styles.hudLabel}>{blueprint.hud.label}</p>
          </div>

          <p style={styles.label}>Description</p>
          <p style={styles.value}>{blueprint.description}</p>

          <p style={styles.label}>Features</p>
          <ul style={styles.list}>
            {blueprint.features.length ? (
              blueprint.features.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No features yet</li>
            )}
          </ul>

          <p style={styles.label}>Actions</p>
          <ul style={styles.list}>
            {blueprint.actions.length ? (
              blueprint.actions.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No actions yet</li>
            )}
          </ul>
        </div>

        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h2 style={styles.cardTitle}>Raw JSON</h2>
          <pre style={styles.pre}>{JSON.stringify(blueprint, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background:
      "radial-gradient(circle at top, rgba(64, 104, 255, 0.18), transparent 32%), #05070d",
    color: "#fff",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    maxWidth: 1200,
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    letterSpacing: "0.2em",
    color: "#86c8ff",
  },
  title: {
    margin: "8px 0",
    fontSize: "clamp(32px, 5vw, 56px)",
    lineHeight: 1,
  },
  subtext: {
    margin: 0,
    color: "rgba(255,255,255,0.68)",
    maxWidth: 700,
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#53f0b0",
  },
  grid: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    background: "rgba(12,16,28,0.86)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(18px)",
  },
  cardTitle: {
    margin: "0 0 14px",
    fontSize: 14,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.7)",
  },
  textarea: {
    width: "100%",
    minHeight: 140,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    padding: 14,
    outline: "none",
    resize: "vertical",
    marginBottom: 14,
  },
  button: {
    padding: "12px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #86c8ff, #53f0b0)",
    color: "#04111f",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    marginTop: 12,
    color: "#ff8e8e",
  },
  blueprintTop: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  label: {
    margin: "0 0 6px",
    fontSize: 12,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },
  value: {
    margin: 0,
    fontSize: 18,
  },
  hudBox: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  },
  hudRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 14,
  },
  arrow: {
    fontSize: 56,
    lineHeight: 1,
    fontWeight: 800,
  },
  distance: {
    fontSize: 32,
    fontWeight: 800,
  },
  hudLabel: {
    margin: "10px 0 0",
    color: "rgba(255,255,255,0.68)",
  },
  list: {
    margin: "0 0 14px",
    paddingLeft: 18,
    color: "rgba(255,255,255,0.9)",
  },
  pre: {
    margin: 0,
    padding: 16,
    borderRadius: 18,
    overflow: "auto",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
};
