"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectFile = {
  path: string;
  content: string;
};

type GeneratedProject = {
  projectName: string;
  description: string;
  tagline: string;
  stack: string[];
  installCommand: string;
  runCommand: string;
  notes: string[];
  files: ProjectFile[];
};

type GenerateResponse = {
  project: GeneratedProject;
  source?: "groq" | "fallback";
  warning?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompt = "make a navigation app with a glass overlay HUD";

const promptPresets = [
  "make a navigation app with a glass overlay HUD",
  "make a smart glasses camera app",
  "make an AI assistant app for smart glasses",
  "make a minimal HUD builder app",
];

function fileLanguage(path: string) {
  if (path.endsWith(".tsx")) return "TSX";
  if (path.endsWith(".ts")) return "TS";
  if (path.endsWith(".css")) return "CSS";
  if (path.endsWith(".md")) return "MD";
  if (path.endsWith(".json")) return "JSON";
  return "TXT";
}

function safeFileName(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function previewConfig(project: GeneratedProject | null) {
  const name = project?.projectName?.toLowerCase() ?? "";

  if (name.includes("camera")) {
    return {
      title: "Camera preview",
      badge: "SCAN READY",
      arrow: "↑",
      distance: "12",
      chips: ["AI scan", "Capture", "Analyze"],
      tone: "camera",
    };
  }

  if (name.includes("assistant")) {
    return {
      title: "Assistant preview",
      badge: "ASSISTANT ONLINE",
      arrow: "→",
      distance: "0",
      chips: ["Ask", "Reply", "Notes"],
      tone: "assistant",
    };
  }

  if (name.includes("navigation")) {
    return {
      title: "Navigation preview",
      badge: "ROUTE LOCKED",
      arrow: "→",
      distance: "42",
      chips: ["Route", "Recenter", "Voice"],
      tone: "navigation",
    };
  }

  return {
    title: "Glass preview",
    badge: "PREVIEW READY",
    arrow: "↑",
    distance: "24",
    chips: ["Open", "Refine", "Export"],
    tone: "default",
  };
}

function buildPreviewSrcDoc(project: GeneratedProject | null) {
  const cfg = previewConfig(project);
  const title = escapeHtml(project?.projectName ?? "Generated project");
  const tagline = escapeHtml(project?.tagline ?? "Your app will appear here.");
  const description = escapeHtml(
    project?.description ?? "Generate a project to see the visible app preview."
  );

  const stack = (project?.stack?.length ? project.stack : ["Next.js", "TypeScript", "React"])
    .slice(0, 3)
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join("");

  const chips = cfg.chips
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 30% 20%, rgba(134, 200, 255, 0.18), transparent 24%),
        radial-gradient(circle at 80% 20%, rgba(83, 240, 176, 0.12), transparent 26%),
        linear-gradient(180deg, #0a0e18 0%, #04070d 100%);
      color: #fff;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 36px 36px;
      opacity: 0.08;
      mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
      pointer-events: none;
    }
    .wrap {
      width: 100%;
      height: 100%;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      backdrop-filter: blur(18px);
    }
    .hero {
      max-width: 420px;
      padding-top: 4px;
    }
    .kicker {
      margin: 0 0 10px;
      color: #86c8ff;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: 34px;
      line-height: 0.95;
      letter-spacing: -0.05em;
    }
    .copy {
      margin: 10px 0 0;
      color: rgba(255,255,255,0.72);
      line-height: 1.55;
      font-size: 14px;
    }
    .hud {
      margin-top: auto;
      padding: 18px;
      border-radius: 22px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(18px);
    }
    .hud-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 18px;
    }
    .mini {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.64);
    }
    .mini.muted { color: rgba(255,255,255,0.5); }
    .center {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 10px 0 18px;
    }
    .arrow {
      font-size: 82px;
      line-height: 1;
      font-weight: 800;
      text-shadow: 0 0 24px rgba(134, 200, 255, 0.26);
    }
    .distance {
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -0.06em;
    }
    .distance span {
      font-size: 0.42em;
      color: rgba(255,255,255,0.62);
      margin-left: 6px;
    }
    .rows, .footer {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      color: rgba(255,255,255,0.82);
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="badge">LIVE PREVIEW</div>
      <div class="badge">${escapeHtml(project?.stack?.[0] ?? "Next.js")}</div>
    </div>

    <div class="hero">
      <p class="kicker">${title}</p>
      <h1>${escapeHtml(cfg.title)}</h1>
      <p class="copy">${tagline}</p>
      <p class="copy">${description}</p>
    </div>

    <div class="hud">
      <div class="hud-top">
        <span class="mini">${escapeHtml(cfg.badge)}</span>
        <span class="mini muted">Preview mode</span>
      </div>

      <div class="center">
        <div class="arrow">${cfg.arrow}</div>
        <div class="distance">${cfg.distance}<span>m</span></div>
      </div>

      <div class="rows">
        ${stack}
        ${chips}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function Page() {
  const [prompt, setPrompt] = useState(starterPrompt);
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [source, setSource] = useState<"idle" | "groq" | "fallback">("idle");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showManifest, setShowManifest] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me to improve the project, change the style, or add features.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    setSelectedPath(project?.files?.[0]?.path ?? "");
  }, [project]);

  const selectedFile = useMemo(() => {
    if (!project) return null;
    return (
      project.files.find((file) => file.path === selectedPath) ??
      project.files[0] ??
      null
    );
  }, [project, selectedPath]);

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(project), [project]);
  const cfg = useMemo(() => previewConfig(project), [project]);

  const buildStatus =
    loading
      ? "Generating..."
      : source === "groq"
        ? "AI connected"
        : source === "fallback"
          ? "Fallback mode"
          : "Ready";

  const buildTone =
    loading
      ? "busy"
      : source === "groq"
        ? "good"
        : source === "fallback"
          ? "warn"
          : "idle";

  async function generateProject() {
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = (await res.json()) as GenerateResponse;

      if (!res.ok) {
        throw new Error(data?.warning || "Generation failed");
      }

      setProject(data.project);
      setSource(data.source ?? "fallback");
      setWarning(data.warning ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  }

  async function downloadProjectZip() {
    if (!project) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    zip.file(
      "project-manifest.json",
      JSON.stringify(
        {
          projectName: project.projectName,
          description: project.description,
          tagline: project.tagline,
          stack: project.stack,
          installCommand: project.installCommand,
          runCommand: project.runCommand,
          notes: project.notes,
          files: project.files.map((file) => file.path),
        },
        null,
        2
      )
    );

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `${safeFileName(project.projectName)}.zip`);
  }

  function downloadManifest() {
    if (!project) return;

    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });

    downloadBlob(blob, `${safeFileName(project.projectName)}-manifest.json`);
  }

  async function copyCode() {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
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
          project,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.warning || data?.error || "Chat failed");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: String(data?.reply ?? "I could not answer."),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Unknown error");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I had trouble reaching the AI. Try again, or generate the project again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const stackChips = project?.stack ?? [];
  const fileCount = project?.files.length ?? 0;
  const selectedCode = selectedFile?.content ?? "";

  return (
    <main className="shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="noise" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI APP GENERATOR</p>
          <h1>Build real projects from a prompt</h1>
          <p className="subtext">
            Generate a project, inspect the files, preview the code, see the app, and chat with the AI.
          </p>
        </div>

        <div className={`status ${buildTone}`}>
          <span className="dot" />
          <span>{buildStatus}</span>
        </div>
      </section>

      <section className="prompt-panel panel">
        <div className="prompt-top">
          <div>
            <h2>Describe the app</h2>
            <p className="panel-subtitle">
              Start with an idea and turn it into a structured project.
            </p>
          </div>
          <div className="prompt-count">{project ? `${fileCount} files` : "No project yet"}</div>
        </div>

        <textarea
          className="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the app you want to generate..."
        />

        <div className="toolbar-actions">
          <button
            className="button primary"
            onClick={generateProject}
            type="button"
          >
            {loading ? "Generating..." : "Generate project"}
          </button>
          <button
            className="button"
            onClick={downloadProjectZip}
            type="button"
            disabled={!project}
          >
            Download ZIP
          </button>
          <button
            className="button"
            onClick={downloadManifest}
            type="button"
            disabled={!project}
          >
            Download JSON
          </button>
        </div>

        <div className="preset-row">
          {promptPresets.map((item) => (
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

        {error ? <p className="message error">{error}</p> : null}
        {warning ? <p className="message warn">{warning}</p> : null}
      </section>

      <section className="stats">
        <div className="stat-card">
          <span className="label">Project</span>
          <strong>{project?.projectName ?? "No project yet"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Files</span>
          <strong>{fileCount}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Install</span>
          <strong>{project?.installCommand ?? "npm install"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Run</span>
          <strong>{project?.runCommand ?? "npm run dev"}</strong>
        </div>
      </section>

      <section className="content-grid">
        <div className="left-col">
          <div className="panel section-panel">
            <div className="panel-head">
              <div>
                <h2>Files</h2>
                <p className="panel-subtitle">
                  Select a file to inspect its code.
                </p>
              </div>
            </div>

            <div className="project-card">
              <p className="project-title">
                {project?.projectName ?? "Generated project"}
              </p>
              <p className="project-subtitle">
                {project?.tagline ?? "Generate a project to see it here."}
              </p>
              <p className="project-copy">
                {project?.description ?? "Prompt your AI to create a full app."}
              </p>
            </div>

            <div className="file-list">
              {project?.files?.length ? (
                project.files.map((file) => (
                  <button
                    key={file.path}
                    className={`file-item ${
                      selectedPath === file.path ? "active" : ""
                    }`}
                    onClick={() => setSelectedPath(file.path)}
                    type="button"
                  >
                    <span className="file-path">{file.path}</span>
                    <span className="file-lang">{fileLanguage(file.path)}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  Generate a project and the files will appear here.
                </div>
              )}
            </div>

            <div className="chip-row">
              {stackChips.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="panel section-panel">
            <div className="panel-head">
              <div>
                <h2>Code output</h2>
                <p className="panel-subtitle">
                  {selectedFile
                    ? selectedFile.path
                    : "Select a file to preview its code"}
                </p>
              </div>

              <button
                className="button"
                onClick={copyCode}
                type="button"
                disabled={!selectedFile}
              >
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>

            {selectedFile ? (
              <>
                <div className="code-meta">
                  <span className="code-pill">
                    {fileLanguage(selectedFile.path)}
                  </span>
                  <span className="code-pill muted">{selectedFile.path}</span>
                </div>

                <pre className="code">{selectedCode}</pre>
              </>
            ) : (
              <div className="empty-state code-empty">
                No file selected yet.
              </div>
            )}
          </div>
        </div>

        <div className="right-col">
          <div className="panel section-panel">
            <div className="panel-head">
              <div>
                <h2>{cfg.title}</h2>
                <p className="panel-subtitle">
                  The generated app appears here as a live preview.
                </p>
              </div>
            </div>

            <div className={`app-preview ${cfg.tone}`}>
              {project ? (
                <iframe
                  title="Generated app preview"
                  srcDoc={previewSrcDoc}
                  className="preview-iframe"
                />
              ) : (
                <div className="preview-empty">
                  Generate a project to see the live preview.
                </div>
              )}
            </div>
          </div>

          <div className="panel section-panel">
            <div className="panel-head">
              <div>
                <h2>Chat AI</h2>
                <p className="panel-subtitle">
                  Ask the AI to improve the current project.
                </p>
              </div>
            </div>

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
              <div className="chat-anchor" />
            </div>

            <div className="chat-presets">
              <button
                className="preset"
                type="button"
                onClick={() => sendChat("Make this more minimal and premium.")}
              >
                Minimal
              </button>
              <button
                className="preset"
                type="button"
                onClick={() => sendChat("Add a camera mode and AI scan flow.")}
              >
                Camera
              </button>
              <button
                className="preset"
                type="button"
                onClick={() =>
                  sendChat("Turn this into a smart glasses assistant app.")
                }
              >
                Assistant
              </button>
            </div>

            <div className="chat-row">
              <input
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask the AI what to improve..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
              />
              <button
                className="button primary"
                type="button"
                onClick={() => void sendChat()}
              >
                Send
              </button>
            </div>

            {chatError ? <p className="message error">{chatError}</p> : null}
          </div>
        </div>
      </section>

      <section className="panel notes">
        <div className="panel-head">
          <div>
            <h2>Project notes</h2>
            <p className="panel-subtitle">
              What the generator created for you
            </p>
          </div>

          <button
            className="button"
            onClick={() => setShowManifest((v) => !v)}
            type="button"
          >
            {showManifest ? "Hide manifest" : "Show manifest"}
          </button>
        </div>

        <ul className="notes-list">
          {(project?.notes ?? ["Generate a project to see the notes."]).map(
            (note) => (
              <li key={note}>{note}</li>
            )
          )}
        </ul>

        {showManifest && project ? (
          <pre className="manifest">{JSON.stringify(project, null, 2)}</pre>
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
          min-height: 100%;
          background: #05070d;
          color: #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          overflow-x: hidden;
        }

        button,
        textarea,
        input {
          font: inherit;
        }

        .shell {
          position: relative;
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(98, 143, 255, 0.18), transparent 30%),
            radial-gradient(circle at bottom right, rgba(83, 240, 176, 0.12), transparent 28%),
            #05070d;
        }

        .orb {
          position: fixed;
          z-index: 0;
          filter: blur(50px);
          pointer-events: none;
          opacity: 0.75;
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

        .noise {
          position: fixed;
          inset: 0;
          z-index: 0;
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: radial-gradient(circle at center, black 44%, transparent 100%);
          pointer-events: none;
        }

        .hero,
        .prompt-panel,
        .stats,
        .content-grid,
        .notes {
          position: relative;
          z-index: 1;
          max-width: 1460px;
          margin: 0 auto 18px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .hero-copy {
          max-width: 900px;
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
          font-size: clamp(36px, 5.4vw, 68px);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .subtext {
          max-width: 820px;
          margin: 14px 0 0;
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

        .panel,
        .stat-card {
          backdrop-filter: blur(18px);
          background: rgba(12, 16, 28, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
        }

        .panel {
          padding: 20px;
          border-radius: 24px;
        }

        .prompt-panel {
          padding: 20px;
          border-radius: 28px;
        }

        .prompt-top,
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .prompt-top h2,
        .panel-head h2 {
          margin: 0;
          font-size: 18px;
        }

        .panel-subtitle {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
        }

        .prompt-count {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
        }

        .prompt {
          width: 100%;
          min-height: 118px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          resize: vertical;
          outline: none;
        }

        .prompt:focus,
        .chat-input:focus {
          border-color: rgba(134, 200, 255, 0.55);
        }

        .toolbar-actions,
        .preset-row,
        .chip-row,
        .chat-presets {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toolbar-actions {
          margin-top: 12px;
        }

        .preset,
        .button,
        .chip,
        .code-pill {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-radius: 16px;
        }

        .button {
          padding: 12px 16px;
          cursor: pointer;
        }

        .button.primary {
          background: linear-gradient(135deg, #86c8ff, #53f0b0);
          color: #04111f;
          border: none;
          font-weight: 700;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preset {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 12px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .stat-card {
          padding: 16px;
          border-radius: 20px;
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

        .stat-card strong {
          display: block;
          font-size: 18px;
          word-break: break-word;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
        }

        .left-col,
        .right-col {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .section-panel {
          min-width: 0;
        }

        .project-card {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 14px;
        }

        .project-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
        }

        .project-subtitle {
          margin: 0 0 10px;
          color: #86c8ff;
        }

        .project-copy {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.6;
        }

        .file-list {
          display: grid;
          gap: 10px;
          max-height: 320px;
          overflow: auto;
          padding-right: 2px;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          width: 100%;
          padding: 14px 16px;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .file-item.active {
          border-color: rgba(134, 200, 255, 0.5);
          background: rgba(134, 200, 255, 0.1);
        }

        .file-path {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-lang {
          font-size: 11px;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.56);
          text-transform: uppercase;
        }

        .chip {
          padding: 10px 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .empty-state {
          padding: 18px;
          border-radius: 18px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.62);
          background: rgba(255, 255, 255, 0.03);
        }

        .code-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .code-pill {
          padding: 8px 12px;
          font-size: 12px;
        }

        .code-pill.muted {
          color: rgba(255, 255, 255, 0.64);
        }

        .code {
          margin: 0;
          min-height: 420px;
          max-height: 520px;
          overflow: auto;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          white-space: pre;
          font-size: 13px;
          line-height: 1.7;
        }

        .app-preview {
          min-height: 520px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 30% 20%, rgba(98, 143, 255, 0.18), transparent 24%),
            radial-gradient(circle at 80% 25%, rgba(83, 240, 176, 0.12), transparent 22%),
            linear-gradient(180deg, rgba(10, 14, 24, 0.95), rgba(4, 7, 13, 0.98));
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          min-height: 520px;
          border: 0;
          display: block;
          background: transparent;
        }

        .preview-empty {
          min-height: 520px;
          display: grid;
          place-items: center;
          color: rgba(255, 255, 255, 0.68);
          padding: 20px;
          text-align: center;
        }

        .chat-box {
          min-height: 240px;
          max-height: 340px;
          overflow-y: auto;
          display: grid;
          gap: 10px;
          padding-right: 4px;
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
          margin-top: 12px;
        }

        .chat-input {
          flex: 1;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
        }

        .notes {
          padding: 20px;
          border-radius: 24px;
        }

        .notes-list {
          margin: 0;
          padding-left: 18px;
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.7;
        }

        .manifest {
          margin: 16px 0 0;
          padding: 16px;
          border-radius: 18px;
          overflow: auto;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          white-space: pre;
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

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }

        @media (max-width: 1180px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .shell {
            padding: 16px;
          }

          .hero {
            align-items: flex-start;
          }

          .status {
            width: 100%;
            justify-content: center;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .toolbar-actions,
          .preset-row,
          .chat-presets,
          .chat-row {
            display: grid;
          }

          .button,
          .preset,
          .stat-card {
            width: 100%;
          }

          .preview-iframe,
          .preview-empty,
          .app-preview {
            min-height: 420px;
          }

          .panel,
          .prompt-panel,
          .notes {
            border-radius: 20px;
          }
        }
      `}</style>
    </main>
  );
}
