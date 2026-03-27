"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

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

type BuildTab = "builder" | "chat" | "preview";

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

const SNAP_POINTS = [0.12, 0.58, 1] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

function closestSnapPoint(progress: number) {
  return SNAP_POINTS.reduce((best, current) =>
    Math.abs(current - progress) < Math.abs(best - progress) ? current : best
  );
}

export default function Page() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

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

  const [activeTab, setActiveTab] = useState<BuildTab>("builder");
  const [showJson, setShowJson] = useState(false);

  const [sheetProgress, setSheetProgress] = useState(0.58);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    startY: number;
    startProgress: number;
    startTime: number;
    lastY: number;
    lastTime: number;
    moved: boolean;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevBackground = document.body.style.background;

    document.body.style.overflow = "hidden";
    document.body.style.background = "#020308";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.background = prevBackground;
    };
  }, []);

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

  const sheetHeight = useMemo(() => {
    if (!viewport.height) return 760;
    return Math.min(Math.round(viewport.height * 0.88), 860);
  }, [viewport.height]);

  const peekHeight = 108;
  const closedTranslateY = Math.max(0, sheetHeight - peekHeight);
  const translateY = closedTranslateY * (1 - sheetProgress);

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
      setActiveTab("preview");
      setSheetProgress(1);
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
    setActiveTab("chat");
    setSheetProgress(Math.max(sheetProgress, 0.72));

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

  function cycleSheet() {
    const current = sheetProgress;
    if (current < SNAP_POINTS[1]) {
      setSheetProgress(SNAP_POINTS[1]);
    } else if (current < SNAP_POINTS[2]) {
      setSheetProgress(SNAP_POINTS[2]);
    } else {
      setSheetProgress(SNAP_POINTS[0]);
    }
  }

  function onGrabberPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startProgress: sheetProgress,
      startTime: performance.now(),
      lastY: e.clientY,
      lastTime: performance.now(),
      moved: false,
    };
    setDragging(true);
  }

  function onGrabberPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const now = performance.now();
    const deltaY = e.clientY - drag.startY;
    const nextProgress = clamp(
      drag.startProgress - deltaY / Math.max(1, closedTranslateY),
      SNAP_POINTS[0],
      SNAP_POINTS[2]
    );

    if (Math.abs(deltaY) > 4) {
      drag.moved = true;
    }

    drag.lastY = e.clientY;
    drag.lastTime = now;
    setSheetProgress(nextProgress);
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) {
      setDragging(false);
      return;
    }

    const elapsed = Math.max(1, drag.lastTime - drag.startTime);
    const velocity = (drag.lastY - drag.startY) / elapsed;

    let target = closestSnapPoint(sheetProgress);

    if (velocity < -0.35) {
      if (sheetProgress > SNAP_POINTS[0]) {
        target = sheetProgress > SNAP_POINTS[1] ? SNAP_POINTS[2] : SNAP_POINTS[1];
      }
    } else if (velocity > 0.35) {
      if (sheetProgress < SNAP_POINTS[2]) {
        target = sheetProgress < SNAP_POINTS[1] ? SNAP_POINTS[0] : SNAP_POINTS[1];
      }
    }

    setSheetProgress(target);
    dragRef.current = null;
    setDragging(false);
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

        <button className="ghost-btn" onClick={cycleSheet}>
          Pull sheet
        </button>
      </header>

      <section className="hud" aria-label="HUD preview">
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

      <section
        className="drawer"
        style={{
          height: sheetHeight,
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: dragging ? "none" : "transform 260ms cubic-bezier(.2,.9,.2,1)",
        }}
        aria-label="Control sheet"
      >
        <div className="drawer-bar">
          <button
            className="drawer-grabber"
            onPointerDown={onGrabberPointerDown}
            onPointerMove={onGrabberPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onClick={() => {
              if (!dragRef.current?.moved) cycleSheet();
            }}
          >
            <span className="grabber-line" />
          </button>

          <div className="drawer-actions">
            <button className="small-btn" onClick={() => setActiveTab("builder")}>
              Builder
            </button>
            <button className="small-btn" onClick={() => setActiveTab("chat")}>
              Chat
            </button>
            <button className="small-btn" onClick={() => setActiveTab("preview")}>
              Preview
            </button>
          </div>
        </div>

        <div className="segmented">
          <button
            className={`segment ${activeTab === "builder" ? "active" : ""}`}
            onClick={() => setActiveTab("builder")}
          >
            Build
          </button>
          <button
            className={`segment ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`segment ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
        </div>

        <div className="sheet-scroll">
          {activeTab === "builder" ? (
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
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="button-row">
                  <button className="action-btn primary" onClick={buildApp} type="button">
                    {buildLoading ? "Building..." : "Build app"}
                  </button>
                  <button className="action-btn" onClick={exportJson} type="button">
                    Export JSON
                  </button>
                </div>

                {buildError ? <p className="message error">{buildError}</p> : null}
                {buildWarning ? <p className="message warn">{buildWarning}</p> : null}
              </div>

              <div className="panel">
                <p className="panel-kicker">Quick actions</p>

                <div className="stack-actions">
                  <button className="stack-btn" onClick={() => sendChat("Make this more minimal and premium.")}>
                    Minimal
                  </button>
                  <button className="stack-btn" onClick={() => sendChat("Add a camera mode and AI scan flow.")}>
                    Camera
                  </button>
                  <button className="stack-btn" onClick={() => sendChat("Turn this into a smart glasses assistant app.")}>
                    Assistant
                  </button>
                </div>

                <div className="mini-note">
                  The HUD stays visible while you edit below.
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "chat" ? (
            <div className="drawer-grid single">
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

                <div className="chat-pills">
                  <button
                    className="preset"
                    onClick={() => sendChat("Make this more minimal and premium.")}
                    type="button"
                  >
                    Minimal
                  </button>
                  <button
                    className="preset"
                    onClick={() => sendChat("Add a camera mode and AI scan flow.")}
                    type="button"
                  >
                    Camera
                  </button>
                  <button
                    className="preset"
                    onClick={() =>
                      sendChat("Turn this into a smart glasses assistant app.")
                    }
                    type="button"
                  >
                    Assistant
                  </button>
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
                  <button className="action-btn primary" onClick={() => void sendChat()}>
                    Send
                  </button>
                </div>

                {chatError ? <p className="message error">{chatError}</p> : null}
              </div>
            </div>
          ) : null}

          {activeTab === "preview" ? (
            <div className="drawer-grid single">
              <div className="panel">
                <p className="panel-kicker">Blueprint</p>

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
                    <span className="arrow small">{hudArrow}</span>
                    <span className="distance small">
                      {Math.max(0, Math.round(blueprint.hud.distance))}m
                    </span>
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

                <button
                  className="action-btn"
                  onClick={() => setShowJson((v) => !v)}
                  type="button"
                >
                  {showJson ? "Hide JSON" : "Show JSON"}
                </button>

                {showJson ? (
                  <pre className="pre">{JSON.stringify(blueprint, null, 2)}</pre>
                ) : null}
              </div>
            </div>
          ) : null}
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
          width: 100%;
          height: 100%;
          background: #020308;
          color: #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          overflow: hidden;
          overscroll-behavior: none;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
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
          background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.5) 0.5px,
            transparent 0.8px
          );
          background-size: 3px 3px;
        }

        .overlay-top {
          position: absolute;
          top: calc(16px + env(safe-area-inset-top));
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

        .status-pill.center-pill {
          justify-content: center;
          min-width: 104px;
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
        .preset,
        .action-btn,
        .segment {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-radius: 14px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
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
          border: 1px solid rgba(134, 200, 255, 0.16);
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

        .arrow.small {
          font-size: 64px;
        }

        .distance {
          font-size: clamp(28px, 4vw, 54px);
          font-weight: 800;
          letter-spacing: -0.05em;
        }

        .distance.small {
          font-size: 36px;
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
          bottom: 0;
          transform: translate3d(0, 0, 0);
          width: min(1180px, calc(100vw - 16px));
          margin-left: -min(590px, calc((100vw - 16px) / 2));
          z-index: 6;
          pointer-events: auto;
          will-change: transform;
        }

        .drawer-bar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          padding: 0 8px;
        }

        .drawer-grabber {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 88px;
          height: 30px;
          border-radius: 999px;
          padding: 0;
          touch-action: none;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .grabber-line {
          width: 34px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.42);
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

        .segmented {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 8px;
          margin: 0 8px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(18px);
        }

        .segment {
          padding: 12px 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.78);
        }

        .segment.active {
          background: rgba(134, 200, 255, 0.16);
          border-color: rgba(134, 200, 255, 0.3);
          color: #fff;
        }

        .sheet-scroll {
          height: calc(100% - 88px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 8px calc(20px + env(safe-area-inset-bottom));
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

        .drawer-grid.single {
          grid-template-columns: 1fr;
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
        .chat-pills,
        .stack-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .preset,
        .stack-btn {
          padding: 10px 12px;
          font-size: 12px;
        }

        .stack-actions {
          display: grid;
          gap: 10px;
        }

        .stack-btn {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-radius: 16px;
        }

        .button-row,
        .chat-row {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .chat-row .chat-input {
          flex: 1;
        }

        .action-btn {
          padding: 12px 16px;
          border-radius: 16px;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #86c8ff, #53f0b0);
          color: #04111f;
          border: none;
          font-weight: 700;
        }

        .mini-note {
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 13px;
          line-height: 1.55;
        }

        .chat-box {
          min-height: 220px;
          max-height: 300px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
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

        .message {
          margin: 10px 0 0;
        }

        .message.error {
          color: #ff8e8e;
        }

        .message.warn {
          color: #ffd37a;
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
          margin: 14px 0 0;
          padding: 16px;
          border-radius: 18px;
          overflow: auto;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 100%;
        }

        .small {
          font-size: 36px;
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

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .hud-frame {
            width: 96vw;
            height: 96vw;
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
            width: calc(100vw - 8px);
            left: 50%;
            margin-left: -50vw;
          }

          .drawer-bar,
          .drawer-actions,
          .button-row,
          .chat-row {
            display: grid;
          }

          .drawer-btn,
          .small-btn,
          .preset,
          .action-btn {
            width: 100%;
          }

          .hud-frame {
            width: 100vw;
            height: 100vw;
          }

          .chips {
            width: calc(100% - 20px);
          }
        }
      `}</style>
    </main>
  );
}
