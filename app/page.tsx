"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type BuildResponse = {
  blueprint: Blueprint;
  source?: "groq" | "fallback";
  warning?: string;
};

const emptyBlueprint: Blueprint = {
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

const presets = [
  "make a navigation app with arrow and distance",
  "make a camera app with AI scan button",
  "make a minimal HUD for smart glasses",
  "make an assistant app with voice and text",
];

const starterChat: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "I am ready. Ask me to build, improve, or simplify the app you are making.",
  },
];

function arrowSymbol(direction: Blueprint["hud"]["direction"]) {
  switch (direction) {
    case "left":
      return "←";
    case "right":
      return "→";
    case "down":
      return "↓";
    default:
      return "↑";
  }
}

export default function Page() {
  const [prompt, setPrompt] = useState(
    "make a navigation app with arrow and distance"
  );
  const [blueprint, setBlueprint] = useState<Blueprint>(emptyBlueprint);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildWarning, setBuildWarning] = useState("");
  const [buildSource, setBuildSource] = useState<"idle" | "groq" | "fallback">(
    "idle"
  );

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(starterChat);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [showDevPanel, setShowDevPanel] = useState(false);
  const [hudOnly, setHudOnly] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const buildStatus = useMemo(() => {
    if (buildLoading) return "Building...";
    if (buildSource === "groq") return "AI connected";
    if (buildSource === "fallback") return "Fallback mode";
    return "Ready";
  }, [buildLoading, buildSource]);

  const buildTone = useMemo(() => {
    if (buildLoading) return "busy";
    if (buildSource === "groq") return "good";
    if (buildSource === "fallback") return "warn";
    return "idle";
  }, [buildLoading, buildSource]);

  async function buildApp() {
    setBuildLoading(true);
    setBuildError("");
    setBuildWarning("");

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
        throw new Error(data?.warning || "Build failed");
      }

      setBlueprint(data.blueprint ?? emptyBlueprint);
      setBuildSource(data.source ?? "fallback");
      setBuildWarning(data.warning ?? "");
      setHudOnly(true);
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "Unknown error");
      setBuildSource("fallback");
    } finally {
      setBuildLoading(false);
    }
  }

  async function sendChat(customText?: string) {
    const text = (customText ?? chatInput).trim();
    if (!text || chatLoading) return;

    setChatError("");
    setChatInput("");

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: text },
    ];

    setChatMessages(nextMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          blueprint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Chat failed");
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply || "I could not generate a reply.",
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unknown error");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I had trouble reaching the AI. Try again, or change the prompt and build again.",
        },
      ]);
    } finally {
      setChatLoading(false);
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

  const deviceLabel = buildSource === "groq" ? "LIVE" : buildSource === "fallback" ? "SIM" : "IDLE";
  const hudArrow = arrowSymbol(blueprint.hud.direction);

  return (
    <main className="scene">
      <div className="feed feed-a" />
      <div className="feed feed-b" />
      <div className="feed feed-c" />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="grain" />

      <header className="overlay-top">
        <div className={`status-pill ${buildTone}`}>
          <span className="dot" />
          <span>{buildStatus}</span>
        </div>

        <div className="status-pill center-pill">
          <span>{deviceLabel}</span>
        </div>

        <button className="ghost-btn" onClick={() => setHudOnly((v) => !v)}>
          {hudOnly ? "Show tools" : "Hide tools"}
        </button>
      </header>

      <section className={`hud ${hudOnly ? "glass" : ""}`}>
        <div className="hud-frame">
          <div className="corner tl" />
          <div className="corner tr" />
          <div className="corner bl" />
          <div className="corner br" />

          <div className="tiny-tag top-left">GPS LOCK</div>
          <div className="tiny-tag top-right">{blueprint.hud.label}</div>

          <div className="reticle">
            <div className="reticle-ring ring-1" />
            <div className="reticle-ring ring-2" />
            <div className="reticle-ring ring-3" />

            <div className="arrow">{hudArrow}</div>

            <div className="distance">
              {Math.max(0, Math.round(blueprint.hud.distance))}
              <span>m</span>
            </div>

            <div className="mode-line">
              {blueprint.mode.toUpperCase()} · {blueprint.hud.direction.toUpperCase()}
            </div>
          </div>

          <div className="chips">
            <div className="chip glass-chip">SIG 92%</div>
            <div className="chip glass-chip">BAT 87%</div>
            <div className="chip glass-chip">AI READY</div>
          </div>
        </div>
      </section>

      <section className={`drawer ${showDevPanel ? "open" : ""}`}>
        <div className="drawer-bar">
          <button className="drawer-btn" onClick={() => setShowDevPanel((v) => !v)}>
            {showDevPanel ? "Hide tools" : "Show tools"}
          </button>

          <div className="drawer-actions">
            <button className="small-btn" onClick={buildApp}>
              {buildLoading ? "Building..." : "Build"}
            </button>
            <button className="small-btn" onClick={exportJson}>
              Export JSON
            </button>
          </div>
        </div>

        {showDevPanel ? (
          <div className="drawer-grid">
            <div className="panel">
              <p className="panel-kicker">Prompt</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="textarea"
                placeholder="Describe your app..."
              />
              <div className="preset-row">
                {presets.map((item) => (
                  <button
                    key={item}
                    className="preset"
                    onClick={() => setPrompt(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {buildError ? <p className="message error">{buildError}</p> : null}
              {buildWarning ? <p className="message warn">{buildWarning}</p> : null}
            </div>

            <div className="panel">
              <p className="panel-kicker">Chat</p>

              <div className="chat-box">
                {chatMessages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`bubble ${msg.role}`}
                  >
                    {msg.content}
                  </div>
                ))}
                {chatLoading ? <div className="bubble assistant">Thinking…</div> : null}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-row">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="chat-input"
                  placeholder="Ask the AI what to improve..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                />
                <button className="small-btn" onClick={() => void sendChat()}>
                  Send
                </button>
              </div>

              <div className="chat-pills">
                <button
                  className="preset"
                  onClick={() => sendChat("Make this more minimal and premium.")}
                >
                  Minimal
                </button>
                <button
                  className="preset"
                  onClick={() => sendChat("Add a camera mode and AI scan flow.")}
                >
                  Camera
                </button>
                <button
                  className="preset"
                  onClick={() =>
                    sendChat("Turn this into a smart glasses assistant app.")
                  }
                >
                  Assistant
                </button>
              </div>

              {chatError ? <p className="message error">{chatError}</p> : null}
            </div>
          </div>
        ) : null}
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
          width: 100%;
          height: 100%;
          background: #020308;
          color: #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          overflow: hidden;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        .scene {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 40%, rgba(134, 200, 255, 0.12), transparent 34%),
            radial-gradient(circle at 70% 30%, rgba(83, 240, 176, 0.08), transparent 22%),
            linear-gradient(180deg, #05070d 0%, #020308 100%);
        }

        .feed {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .feed-a {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 28%),
            radial-gradient(circle at 30% 28%, rgba(88, 132, 255, 0.18), transparent 18%),
            radial-gradient(circle at 72% 26%, rgba(83, 240, 176, 0.12), transparent 16%);
          filter: blur(24px);
          opacity: 0.95;
        }

        .feed-b {
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
        }

        .feed-c {
          background: radial-gradient(circle at center, transparent 44%, rgba(0, 0, 0, 0.7) 100%);
        }

        .vignette,
        .scanlines,
        .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .vignette {
          background: radial-gradient(circle at center, transparent 32%, rgba(0, 0, 0, 0.62) 100%);
        }

        .scanlines {
          opacity: 0.05;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.18) 0px,
            rgba(255, 255, 255, 0.18) 1px,
            transparent 1px,
            transparent 6px
          );
        }

        .grain {
          opacity: 0.04;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.5) 0.5px, transparent 0.8px);
          background-size: 3px 3px;
        }

        .overlay-top {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(20px);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 12px;
        }

        .status-pill.good .dot {
          background: #53f0b0;
        }

        .status-pill.warn .dot {
          background: #ffd37a;
        }

        .status-pill.busy .dot {
          background: #86c8ff;
          animation: pulse 1s infinite ease-in-out;
        }

        .status-pill.idle .dot {
          background: rgba(255, 255, 255, 0.76);
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.05);
        }

        .ghost-btn,
        .small-btn,
        .drawer-btn,
        .preset {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-radius: 14px;
          cursor: pointer;
        }

        .ghost-btn {
          padding: 10px 14px;
          backdrop-filter: blur(20px);
        }

        .hud {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 2;
          pointer-events: none;
        }

        .hud-frame {
          position: relative;
          width: min(92vw, 760px);
          height: min(92vw, 760px);
          max-width: 760px;
          max-height: 760px;
          display: grid;
          place-items: center;
        }

        .corner {
          position: absolute;
          width: 54px;
          height: 54px;
          border-color: rgba(255, 255, 255, 0.24);
        }

        .corner.tl {
          top: 0;
          left: 0;
          border-top: 1px solid;
          border-left: 1px solid;
          border-top-left-radius: 16px;
        }

        .corner.tr {
          top: 0;
          right: 0;
          border-top: 1px solid;
          border-right: 1px solid;
          border-top-right-radius: 16px;
        }

        .corner.bl {
          bottom: 0;
          left: 0;
          border-bottom: 1px solid;
          border-left: 1px solid;
          border-bottom-left-radius: 16px;
        }

        .corner.br {
          bottom: 0;
          right: 0;
          border-bottom: 1px solid;
          border-right: 1px solid;
          border-bottom-right-radius: 16px;
        }

        .tiny-tag {
          position: absolute;
          font-size: 11px;
          letter-spacing: 0.24em;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }

        .top-left {
          top: 18px;
          left: 18px;
        }

        .top-right {
          top: 18px;
          right: 18px;
        }

        .reticle {
          position: relative;
          display: grid;
          justify-items: center;
          align-items: center;
          gap: 12px;
          transform: translateY(-6px);
        }

        .reticle-ring {
          position: absolute;
          inset: 50%;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          border: 1px solid rgba(134, 200, 255, 0.18);
          box-shadow: 0 0 40px rgba(134, 200, 255, 0.06);
        }

        .ring-1 {
          width: 170px;
          height: 170px;
          animation: pulse 3.6s ease-in-out infinite;
        }

        .ring-2 {
          width: 300px;
          height: 300px;
          opacity: 0.72;
        }

        .ring-3 {
          width: 456px;
          height: 456px;
          opacity: 0.4;
        }

        .arrow {
          font-size: clamp(72px, 10vw, 122px);
          line-height: 1;
          font-weight: 800;
          text-shadow: 0 0 30px rgba(134, 200, 255, 0.25);
          filter: drop-shadow(0 0 18px rgba(134, 200, 255, 0.14));
        }

        .distance {
          font-size: clamp(28px, 4vw, 54px);
          font-weight: 800;
          letter-spacing: -0.05em;
        }

        .distance span {
          font-size: 0.42em;
          color: rgba(255, 255, 255, 0.64);
          margin-left: 6px;
        }

        .mode-line {
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.58);
        }

        .chips {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .glass-chip {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          backdrop-filter: blur(18px);
        }

        .drawer {
          position: absolute;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          width: min(1180px, calc(100vw - 24px));
          z-index: 6;
          pointer-events: auto;
        }

        .drawer-bar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .drawer-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .drawer-btn,
        .small-btn {
          padding: 10px 14px;
        }

        .drawer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 14px;
          border-radius: 24px;
          background: rgba(12, 16, 28, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(24px);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.35);
        }

        .panel {
          min-width: 0;
        }

        .panel-kicker {
          margin: 0 0 10px;
          color: #86c8ff;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .textarea,
        .chat-input {
          width: 100%;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
        }

        .textarea {
          min-height: 120px;
          resize: vertical;
        }

        .textarea:focus,
        .chat-input:focus {
          border-color: rgba(134, 200, 255, 0.55);
        }

        .preset-row,
        .chat-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .preset {
          padding: 9px 12px;
          font-size: 12px;
        }

        .chat-box {
          min-height: 180px;
          max-height: 250px;
          overflow-y: auto;
          display: grid;
          gap: 10px;
        }

        .bubble {
          max-width: 100%;
          padding: 12px 14px;
          border-radius: 16px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bubble.user {
          margin-left: auto;
          background: rgba(134, 200, 255, 0.12);
        }

        .bubble.assistant {
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .chat-row .chat-input {
          flex: 1;
        }

        .message {
          margin: 10px 0 0;
        }

        .message.error {
          color: #ff8e8e;
        }

        .message.warn {
          color: #ffd37a;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.92;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.04);
            opacity: 1;
          }
        }

        @media (max-width: 920px) {
          .drawer-grid {
            grid-template-columns: 1fr;
          }

          .hud-frame {
            width: 96vw;
            height: 96vw;
          }

          .chips {
            width: calc(100% - 20px);
          }
        }

        @media (max-width: 640px) {
          .overlay-top {
            gap: 8px;
          }

          .status-pill {
            width: 100%;
            justify-content: center;
          }

          .ghost-btn {
            width: 100%;
          }

          .drawer {
            width: calc(100vw - 16px);
            bottom: 8px;
          }

          .drawer-bar,
          .drawer-actions,
          .chat-row {
            display: grid;
          }

          .drawer-btn,
          .small-btn,
          .preset {
            width: 100%;
          }

          .hud-frame {
            width: 100vw;
            height: 100vw;
          }

          .hud-bottom {
            width: calc(100% - 24px);
          }
        }
      `}</style>
    </main>
  );
}
