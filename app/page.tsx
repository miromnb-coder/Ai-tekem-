"use client";

import { useMemo, useState } from "react";

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

type BuildResponse = {
  blueprint: Blueprint;
  source?: "groq" | "fallback";
  warning?: string;
};

const defaultBlueprint: Blueprint = {
  title: "Ready",
  description: "Describe the app you want to build.",
  mode: "idle",
  hud: {
    direction: "up",
    distance: 0,
    label: "Waiting",
  },
  features: [],
  actions: [],
  status: "idle",
};

const promptPresets = [
  "make a navigation app with arrow and distance",
  "make a camera app with AI scan button",
  "make a minimal HUD for smart glasses",
  "make an assistant app with voice and text",
];

export default function Page() {
  const [prompt, setPrompt] = useState(
    "make a navigation app with arrow and distance"
  );
  const [blueprint, setBlueprint] = useState<Blueprint>(defaultBlueprint);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"groq" | "fallback" | "idle">("idle");
  const [warning, setWarning] = useState("");

  const statusText = useMemo(() => {
    if (loading) return "Building...";
    if (source === "groq") return "AI connected";
    if (source === "fallback") return "Fallback mode";
    return "Ready";
  }, [loading, source]);

  const statusTone = useMemo(() => {
    if (loading) return "busy";
    if (source === "groq") return "good";
    if (source === "fallback") return "warn";
    return "idle";
  }, [loading, source]);

  async function build() {
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = (await res.json()) as BuildResponse;

      if (!res.ok) {
        throw new Error((data as any)?.error || "Build failed");
      }

      setBlueprint(data.blueprint ?? defaultBlueprint);
      setSource(data.source ?? "fallback");
      setWarning(data.warning ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "halo-blueprint.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function runPreview() {
    setWarning("Preview updated.");
    setSource(source === "idle" ? "fallback" : source);
  }

  return (
    <main className="shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <section className="hero">
        <div>
          <p className="eyebrow">HALO AI APP BUILDER</p>
          <h1>Build apps from prompts</h1>
          <p className="subtext">
            Turn an idea into a structured blueprint for HUD, features, and app actions.
          </p>
        </div>

        <div className={`status ${statusTone}`}>
          <span className="dot" />
          <span>{statusText}</span>
        </div>
      </section>

      <section className="quick-prompts">
        {promptPresets.map((item) => (
          <button
            key={item}
            className="chip"
            onClick={() => setPrompt(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Prompt</h2>
            <span className="mini-label">type or tap a preset</span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="textarea"
            placeholder="Describe your app..."
          />

          <div className="button-row">
            <button className="button primary" onClick={build} type="button">
              {loading ? "Building..." : "Build app"}
            </button>
            <button className="button" onClick={runPreview} type="button">
              Run preview
            </button>
            <button className="button" onClick={exportJson} type="button">
              Export JSON
            </button>
          </div>

          {error ? <p className="message error">{error}</p> : null}
          {warning ? <p className="message warn">{warning}</p> : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Generated blueprint</h2>
            <span className={`badge ${source}`}>{source === "groq" ? "Groq" : source === "fallback" ? "Fallback" : "Idle"}</span>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <span className="label">Title</span>
              <strong>{blueprint.title}</strong>
            </div>
            <div className="summary-card">
              <span className="label">Mode</span>
              <strong>{blueprint.mode}</strong>
            </div>
          </div>

          <div className="hud-card">
            <div className="hud-top">
              <span className="label">HUD</span>
              <span className="hud-pill">{blueprint.hud.label}</span>
            </div>

            <div className="hud-row">
              <span className="arrow">{blueprint.hud.direction}</span>
              <span className="distance">{blueprint.hud.distance}m</span>
            </div>
          </div>

          <div className="section-block">
            <span className="label">Description</span>
            <p className="text">{blueprint.description}</p>
          </div>

          <div className="section-block">
            <span className="label">Features</span>
            <ul className="list">
              {blueprint.features.length ? (
                blueprint.features.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No features yet</li>
              )}
            </ul>
          </div>

          <div className="section-block">
            <span className="label">Actions</span>
            <ul className="list">
              {blueprint.actions.length ? (
                blueprint.actions.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No actions yet</li>
              )}
            </ul>
          </div>
        </div>

        <div className="panel full">
          <div className="panel-head">
            <h2>Raw JSON</h2>
            <span className="mini-label">export-ready</span>
          </div>
          <pre className="pre">{JSON.stringify(blueprint, null, 2)}</pre>
        </div>
      </section>

      <style jsx global>{`
        :root {
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #05070d;
          color: #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          overflow-x: hidden;
        }

        button,
        textarea {
          font: inherit;
        }

        .shell {
          position: relative;
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(98, 143, 255, 0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(83, 240, 176, 0.12), transparent 28%),
            #05070d;
          overflow: hidden;
        }

        .orb {
          position: fixed;
          z-index: 0;
          filter: blur(50px);
          pointer-events: none;
          opacity: 0.8;
        }

        .orb-a {
          top: -120px;
          left: -120px;
          width: 320px;
          height: 320px;
          background: rgba(98, 143, 255, 0.2);
        }

        .orb-b {
          right: -100px;
          bottom: -100px;
          width: 360px;
          height: 360px;
          background: rgba(83, 240, 176, 0.12);
        }

        .hero,
        .quick-prompts,
        .grid {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #86c8ff;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(34px, 5vw, 62px);
          line-height: 0.95;
        }

        .subtext {
          max-width: 680px;
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.65;
          font-size: 15px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }

        .status.good .dot {
          background: #53f0b0;
        }

        .status.warn .dot {
          background: #ffd37a;
        }

        .status.busy .dot {
          background: #86c8ff;
          animation: pulse 1s infinite ease-in-out;
        }

        .status.idle .dot {
          background: rgba(255, 255, 255, 0.7);
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .quick-prompts {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }

        .chip {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .chip:hover {
          transform: translateY(-1px);
          border-color: rgba(134, 200, 255, 0.35);
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .panel {
          padding: 20px;
          border-radius: 24px;
          background: rgba(12, 16, 28, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
        }

        .full {
          grid-column: 1 / -1;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .panel-head h2 {
          margin: 0;
          font-size: 18px;
        }

        .mini-label {
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .textarea {
          width: 100%;
          min-height: 160px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          outline: none;
          resize: vertical;
          margin-bottom: 14px;
        }

        .textarea:focus {
          border-color: rgba(134, 200, 255, 0.55);
        }

        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .button {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          padding: 12px 16px;
          border-radius: 16px;
          cursor: pointer;
        }

        .button.primary {
          background: linear-gradient(135deg, #86c8ff, #53f0b0);
          color: #04111f;
          border: none;
          font-weight: 700;
        }

        .message {
          margin: 12px 0 0;
        }

        .message.error {
          color: #ff8e8e;
        }

        .message.warn {
          color: #ffd37a;
        }

        .badge {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }

        .badge.groq {
          background: rgba(83, 240, 176, 0.14);
        }

        .badge.fallback {
          background: rgba(255, 211, 122, 0.14);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .summary-card {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 0;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.54);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .summary-card strong {
          display: block;
          font-size: 18px;
          word-break: break-word;
        }

        .hud-card {
          padding: 18px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          margin-bottom: 14px;
        }

        .hud-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .hud-pill {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
        }

        .hud-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
          flex-wrap: wrap;
        }

        .arrow {
          font-size: clamp(56px, 8vw, 86px);
          line-height: 1;
          font-weight: 800;
          text-transform: uppercase;
        }

        .distance {
          font-size: clamp(30px, 5vw, 44px);
          font-weight: 800;
        }

        .section-block {
          margin-bottom: 14px;
        }

        .text {
          margin: 0;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1.6;
          word-break: break-word;
        }

        .list {
          margin: 0;
          padding-left: 18px;
          color: rgba(255, 255, 255, 0.9);
        }

        .pre {
          margin: 0;
          padding: 16px;
          border-radius: 18px;
          overflow: auto;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 100%;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }

        @media (max-width: 860px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .hero {
            align-items: flex-start;
          }

          .status {
            width: 100%;
            justify-content: center;
          }

          .panel {
            padding: 18px;
          }
        }
      `}</style>
    </main>
  );
}
