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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getPreviewConfig(project: GeneratedProject | null) {
  const name = project?.projectName?.toLowerCase() ?? "";

  if (name.includes("camera")) {
    return {
      badge: "SCAN READY",
      headline: "Camera-first assistant",
      arrow: "↑",
      distance: "12",
      chips: ["AI scan", "Capture", "Analyze"],
      accent: "camera",
    };
  }

  if (name.includes("assistant")) {
    return {
      badge: "ASSISTANT ONLINE",
      headline: "Wearable assistant",
      arrow: "→",
      distance: "0",
      chips: ["Ask", "Reply", "Notes"],
      accent: "assistant",
    };
  }

  if (name.includes("navigation")) {
    return {
      badge: "ROUTE LOCKED",
      headline: "Navigation HUD",
      arrow: "→",
      distance: "42",
      chips: ["Route", "Recenter", "Voice"],
      accent: "navigation",
    };
  }

  return {
    badge: "PREVIEW READY",
    headline: project?.projectName ?? "Glass app preview",
    arrow: "↑",
    distance: "24",
    chips: ["Open", "Refine", "Export"],
    accent: "default",
  };
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

  const preview = useMemo(() => getPreviewConfig(project), [project]);

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

  const stackChips = project?.stack ?? [];
  const fileCount = project?.files.length ?? 0;
  const selectedCode = selectedFile?.content ?? "";

  return (
    <main className="shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="noise" />

      <section className="hero">
        <div>
          <p className="eyebrow">AI APP GENERATOR</p>
          <h1>Build real projects from a prompt</h1>
          <p className="subtext">
            Generate a project, inspect the files, preview the code, see the
            app, and download the whole app as a ZIP.
          </p>
        </div>

        <div className={`status ${buildTone}`}>
          <span className="dot" />
          <span>{buildStatus}</span>
        </div>
      </section>

      <section className="toolbar">
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

      <section className="grid">
        <div className="panel left">
          <div className="panel-head">
            <div>
              <h2>Files</h2>
              <p className="panel-subtitle">
                Click a file to see the code output
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

        <div className="panel right">
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
            <div className="empty-state code-empty">No file selected yet.</div>
          )}
        </div>

        <div className="panel preview">
          <div className="panel-head">
            <div>
              <h2>App preview</h2>
              <p className="panel-subtitle">
                This shows the generated app as a visible preview
              </p>
            </div>
          </div>

          <div className={`app-preview ${preview.accent}`}>
            <div className="preview-orb preview-orb-a" />
            <div className="preview-orb preview-orb-b" />

            <div className="preview-top">
              <span className="preview-badge">LIVE PREVIEW</span>
              <span className="preview-badge muted">
                {project?.stack?.[0] ?? "Next.js"}
              </span>
            </div>

            <div className="preview-hero">
              <p className="preview-kicker">
                {project?.projectName ?? "Generated project"}
              </p>
              <h3>{project?.tagline ?? "Your app will appear here."}</h3>
              <p className="preview-copy">
                {project?.description ??
                  "Generate a project to see the visible app preview."}
              </p>
            </div>

            <div className="preview-hud">
              <div className="preview-hud-top">
                <span className="preview-mini">{preview.badge}</span>
                <span className="preview-mini muted">Preview mode</span>
              </div>

              <div className="preview-hud-center">
                <div className="preview-arrow">{preview.arrow}</div>
                <div className="preview-distance">{preview.distance}m</div>
              </div>

              <div className="preview-actions">
                <button className="preview-btn primary" type="button">
                  Open mode
                </button>
                <button className="preview-btn" type="button">
                  Refine UI
                </button>
                <button className="preview-btn" type="button">
                  Export build
                </button>
              </div>

              <div className="preview-chip-row">
                {preview.chips.map((chip) => (
                  <span key={chip} className="preview-chip">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
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
        textarea {
          font: inherit;
        }

        .shell {
          position: relative;
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(
              circle at top,
              rgba(98, 143, 255, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(83, 240, 176, 0.12),
              transparent 28%
            ),
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
        .toolbar,
        .stats,
        .grid,
        .notes {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto 18px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
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
          max-width: 780px;
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

        .toolbar,
        .panel,
        .stat-card {
          backdrop-filter: blur(18px);
          background: rgba(12, 16, 28, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
        }

        .toolbar {
          padding: 18px;
          border-radius: 24px;
        }

        .prompt {
          width: 100%;
          min-height: 120px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          resize: vertical;
          outline: none;
        }

        .prompt:focus {
          border-color: rgba(134, 200, 255, 0.55);
        }

        .toolbar-actions,
        .preset-row,
        .chip-row,
        .preview-chip-row {
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
        .preview-badge,
        .preview-btn,
        .preview-chip {
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

        .grid {
          display: grid;
          grid-template-columns: 0.8fr 1fr 1fr;
          gap: 18px;
        }

        .panel {
          padding: 20px;
          border-radius: 24px;
          min-width: 0;
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

        .panel-subtitle {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
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
          max-height: 340px;
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

        .right {
          display: flex;
          flex-direction: column;
        }

        .code-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .code-pill {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
        }

        .code-pill.muted {
          color: rgba(255, 255, 255, 0.64);
        }

        .code {
          margin: 0;
          min-height: 580px;
          max-height: 680px;
          overflow: auto;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          white-space: pre;
          font-size: 13px;
          line-height: 1.7;
        }

        .preview {
          display: flex;
          flex-direction: column;
        }

        .app-preview {
          position: relative;
          min-height: 640px;
          padding: 20px;
          border-radius: 24px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(134, 200, 255, 0.16),
              transparent 24%
            ),
            radial-gradient(
              circle at 80% 25%,
              rgba(83, 240, 176, 0.12),
              transparent 22%
            ),
            linear-gradient(180deg, rgba(10, 14, 24, 0.95), rgba(4, 7, 13, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .app-preview.camera {
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(134, 200, 255, 0.2),
              transparent 24%
            ),
            radial-gradient(
              circle at 75% 30%,
              rgba(83, 240, 176, 0.16),
              transparent 22%
            ),
            linear-gradient(180deg, rgba(10, 14, 24, 0.95), rgba(4, 7, 13, 0.98));
        }

        .app-preview.assistant {
          background:
            radial-gradient(
              circle at 35% 18%,
              rgba(134, 200, 255, 0.18),
              transparent 26%
            ),
            radial-gradient(
              circle at 78% 30%,
              rgba(255, 255, 255, 0.1),
              transparent 22%
            ),
            linear-gradient(180deg, rgba(10, 14, 24, 0.95), rgba(4, 7, 13, 0.98));
        }

        .app-preview.navigation {
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(98, 143, 255, 0.18),
              transparent 24%
            ),
            radial-gradient(
              circle at 80% 25%,
              rgba(83, 240, 176, 0.12),
              transparent 22%
            ),
            linear-gradient(180deg, rgba(10, 14, 24, 0.95), rgba(4, 7, 13, 0.98));
        }

        .preview-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          pointer-events: none;
        }

        .preview-orb-a {
          width: 180px;
          height: 180px;
          top: -30px;
          left: -20px;
          background: rgba(98, 143, 255, 0.18);
        }

        .preview-orb-b {
          width: 220px;
          height: 220px;
          right: -50px;
          bottom: -40px;
          background: rgba(83, 240, 176, 0.14);
        }

        .preview-top {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .preview-badge,
        .preview-btn,
        .preview-chip {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }

        .preview-badge {
          padding: 8px 12px;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .preview-badge.muted {
          color: rgba(255, 255, 255, 0.7);
        }

        .preview-hero {
          position: relative;
          z-index: 1;
          max-width: 420px;
          margin-bottom: 24px;
        }

        .preview-kicker {
          margin: 0 0 10px;
          color: #86c8ff;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .preview-hero h3 {
          margin: 0;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 0.95;
        }

        .preview-copy {
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .preview-hud {
          position: relative;
          z-index: 1;
          margin-top: 24px;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(18px);
        }

        .preview-hud-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .preview-mini {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }

        .preview-mini.muted {
          color: rgba(255, 255, 255, 0.5);
        }

        .preview-hud-center {
          display: grid;
          justify-items: center;
          gap: 10px;
          padding: 14px 0 20px;
        }

        .preview-arrow {
          font-size: 84px;
          line-height: 1;
          font-weight: 800;
          text-shadow: 0 0 24px rgba(134, 200, 255, 0.24);
        }

        .preview-distance {
          font-size: 40px;
          font-weight: 800;
        }

        .preview-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .preview-btn {
          padding: 10px 14px;
        }

        .preview-btn.primary {
          background: linear-gradient(135deg, #86c8ff, #53f0b0);
          color: #04111f;
          border: none;
          font-weight: 700;
        }

        .preview-chip-row {
          margin-top: 14px;
        }

        .preview-chip {
          padding: 8px 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
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

        @media (max-width: 1200px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .code {
            min-height: 420px;
          }

          .app-preview {
            min-height: 520px;
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

          .toolbar-actions,
          .preset-row {
            display: grid;
          }

          .button,
          .preset,
          .stat-card {
            width: 100%;
          }

          .preview-actions {
            display: grid;
          }

          .preview-btn {
            width: 100%;
          }

          .panel,
          .toolbar,
          .notes {
            border-radius: 20px;
          }
        }
      `}</style>
    </main>
  );
}
