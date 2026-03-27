import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type Theme = {
  projectName: string;
  description: string;
  tagline: string;
  headline: string;
  subtitle: string;
  hudLabel: string;
  hudDirection: "left" | "right" | "up" | "down";
  hudDistance: number;
  actions: [string, string, string];
  notes: string[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .join("-")
    .slice(0, 40);
}

function detectTheme(prompt: string): Theme {
  const lower = prompt.toLowerCase();

  if (lower.includes("camera") || lower.includes("scan")) {
    return {
      projectName: "Halo Camera",
      description: "A camera-first smart glasses app with scan and AI assist.",
      tagline: "See, scan, and understand faster.",
      headline: "Camera-first AR assistant",
      subtitle: "A clean overlay for scanning scenes, capturing moments, and getting AI help.",
      hudLabel: "Scan ready",
      hudDirection: "up",
      hudDistance: 12,
      actions: ["Scan scene", "Capture frame", "Ask AI"],
      notes: ["Designed for quick capture.", "HUD stays minimal during camera use.", "AI route can be added later."],
    };
  }

  if (lower.includes("assistant") || lower.includes("voice") || lower.includes("chat")) {
    return {
      projectName: "Halo Assistant",
      description: "A conversational smart glasses assistant with text and quick actions.",
      tagline: "Talk naturally. Get useful answers.",
      headline: "Wearable assistant",
      subtitle: "Built for quick replies, short prompts, and an always-visible HUD.",
      hudLabel: "Assistant online",
      hudDirection: "right",
      hudDistance: 0,
      actions: ["Ask question", "Quick reply", "Open notes"],
      notes: ["Conversation is the main surface.", "Keep replies short on the glasses.", "Works well with a chat API later."],
    };
  }

  if (lower.includes("navigation") || lower.includes("route") || lower.includes("hud")) {
    return {
      projectName: "Halo Navigation",
      description: "A minimal navigation HUD with direction and distance.",
      tagline: "Small overlay. Clear guidance.",
      headline: "Navigation HUD",
      subtitle: "One arrow, one distance, one clear next action.",
      hudLabel: "Route locked",
      hudDirection: "right",
      hudDistance: 42,
      actions: ["Start route", "Recenter", "Voice guide"],
      notes: ["Best for minimal glasses UI.", "Keep text small and readable.", "Direction should update live."],
    };
  }

  return {
    projectName: "Halo Glass App",
    description: "A premium smart-glasses app starter with a glass overlay and AI-ready structure.",
    tagline: "Clean overlay. Fast decisions.",
    headline: "Glass overlay app",
    subtitle: "A polished starter that can become navigation, assistant, or scan mode.",
    hudLabel: "Preview ready",
    hudDirection: "up",
    hudDistance: 24,
    actions: ["Open mode", "Refine UI", "Export build"],
    notes: ["Use this as a base template.", "Replace the center HUD with your app logic.", "Swap the AI route to Groq when needed."],
  };
}

function buildPackageJson(theme: Theme) {
  return JSON.stringify(
    {
      name: slugify(theme.projectName) || "halo-glass-app",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "^15.5.14",
        react: "^19.1.0",
        "react-dom": "^19.1.0",
      },
      devDependencies: {
        typescript: "^5.7.2",
        "@types/node": "^22.10.2",
        "@types/react": "^19.1.0",
        "@types/react-dom": "^19.1.0",
      },
    },
    null,
    2
  );
}

function buildLayoutTsx(theme: Theme) {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(theme.projectName)},
  description: ${JSON.stringify(theme.description)},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;
}

function buildPageTsx(theme: Theme) {
  return `"use client";

import { useEffect, useState } from "react";

const APP_NAME = ${JSON.stringify(theme.projectName)};
const HEADLINE = ${JSON.stringify(theme.headline)};
const SUBTITLE = ${JSON.stringify(theme.subtitle)};
const HUD_LABEL = ${JSON.stringify(theme.hudLabel)};
const HUD_DIRECTION = ${JSON.stringify(theme.hudDirection)};
const START_DISTANCE = ${theme.hudDistance};
const ACTIONS = ${JSON.stringify(theme.actions)};

const ARROWS = {
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
} as const;

export default function Page() {
  const [distance, setDistance] = useState(START_DISTANCE);
  const [activeAction, setActiveAction] = useState(ACTIONS[0]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setDistance((value) => Math.max(0, value - 1));
    }, 1500);

    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="screen">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <section className="hero glass">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>{HEADLINE}</h1>
        <p className="copy">{SUBTITLE}</p>
      </section>

      <section className="hud glass">
        <div className="hud-top">
          <span className="tag">{HUD_LABEL}</span>
          <span className="tag muted">Direction: {HUD_DIRECTION}</span>
        </div>

        <div className="hud-center">
          <div className="arrow">{ARROWS[HUD_DIRECTION]}</div>
          <div className="distance">
            {distance}
            <span>m</span>
          </div>
        </div>

        <div className="hud-bottom">
          <button className="button primary" onClick={() => setActiveAction(ACTIONS[0])}>
            {ACTIONS[0]}
          </button>
          <button className="button" onClick={() => setActiveAction(ACTIONS[1])}>
            {ACTIONS[1]}
          </button>
          <button className="button" onClick={() => setActiveAction(ACTIONS[2])}>
            {ACTIONS[2]}
          </button>
        </div>
      </section>

      <section className="status glass">
        <div>
          <p className="mini-label">Current action</p>
          <strong>{activeAction}</strong>
        </div>
        <div>
          <p className="mini-label">Distance</p>
          <strong>{distance}m</strong>
        </div>
      </section>
    </main>
  );
}`;
}

function buildGlobalsCss() {
  return `:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: #020308;
  color: #fff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  overflow: hidden;
}

button {
  font: inherit;
  cursor: pointer;
}

.screen {
  position: relative;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 35%, rgba(134, 200, 255, 0.12), transparent 34%),
    radial-gradient(circle at 70% 30%, rgba(83, 240, 176, 0.08), transparent 22%),
    linear-gradient(180deg, #05070d 0%, #020308 100%);
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(50px);
  opacity: 0.7;
  pointer-events: none;
}

.glow-a {
  top: 10%;
  left: 10%;
  width: 260px;
  height: 260px;
  background: rgba(134, 200, 255, 0.12);
}

.glow-b {
  right: 12%;
  bottom: 12%;
  width: 300px;
  height: 300px;
  background: rgba(83, 240, 176, 0.1);
}

.glass {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(18px);
  background: rgba(12, 16, 28, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
}

.hero {
  max-width: 820px;
  margin: 0 auto 18px;
  padding: 20px;
  border-radius: 24px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #86c8ff;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(34px, 6vw, 64px);
  line-height: 0.95;
}

.copy {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.65;
}

.hud {
  max-width: 820px;
  margin: 0 auto 16px;
  padding: 18px;
  border-radius: 24px;
}

.hud-top,
.hud-bottom {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hud-top {
  justify-content: space-between;
  margin-bottom: 20px;
}

.hud-center {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 18px 0 24px;
}

.arrow {
  font-size: clamp(72px, 12vw, 120px);
  line-height: 1;
  font-weight: 800;
  text-shadow: 0 0 30px rgba(134, 200, 255, 0.22);
}

.distance {
  font-size: clamp(30px, 6vw, 54px);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.distance span {
  font-size: 0.42em;
  color: rgba(255, 255, 255, 0.64);
  margin-left: 6px;
}

.tag,
.button {
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.tag.muted {
  color: rgba(255, 255, 255, 0.72);
}

.button.primary {
  background: linear-gradient(135deg, #86c8ff, #53f0b0);
  color: #04111f;
  border: none;
  font-weight: 700;
}

.status {
  max-width: 820px;
  margin: 0 auto;
  padding: 18px 20px;
  border-radius: 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.mini-label {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.54);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .screen {
    padding: 16px;
  }

  .hero,
  .hud,
  .status {
    border-radius: 20px;
  }

  .hud-bottom,
  .status {
    display: grid;
  }

  .button,
  .tag {
    width: 100%;
    text-align: center;
  }
}`;
}

function buildApiRouteTs(theme: Theme) {
  return `import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APP_NAME = ${JSON.stringify(theme.projectName)};
const HUD_LABEL = ${JSON.stringify(theme.hudLabel)};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  return NextResponse.json({
    reply: prompt
      ? \`For \${APP_NAME}, focus on \${HUD_LABEL.toLowerCase()} and keep the UI minimal. You asked: \${prompt}\`
      : \`Start with \${APP_NAME}. Keep the HUD minimal and one action per screen.\`,
  });
}`;
}

function buildReadme(theme: Theme) {
  return `# ${theme.projectName}

${theme.description}

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## What is inside

- \`app/page.tsx\` for the visual app
- \`app/globals.css\` for the glass overlay styling
- \`app/api/ai/route.ts\` for local AI replies
- \`package.json\` for the Next.js setup

## Notes

${theme.notes.map((note) => `- ${note}`).join("\n")}
`;
}

function createFallbackProject(prompt: string): GeneratedProject {
  const theme = detectTheme(prompt);
  return {
    projectName: theme.projectName,
    description: theme.description,
    tagline: theme.tagline,
    stack: ["Next.js", "TypeScript", "React"],
    installCommand: "npm install",
    runCommand: "npm run dev",
    notes: theme.notes,
    files: [
      { path: "package.json", content: buildPackageJson(theme) },
      { path: "app/layout.tsx", content: buildLayoutTsx(theme) },
      { path: "app/page.tsx", content: buildPageTsx(theme) },
      { path: "app/globals.css", content: buildGlobalsCss() },
      { path: "app/api/ai/route.ts", content: buildApiRouteTs(theme) },
      { path: "README.md", content: buildReadme(theme) },
    ],
  };
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return trimmed.slice(first, last + 1);
}

async function generateWithGroq(prompt: string, theme: Theme) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert AI app generator. Return ONLY valid JSON, no markdown, no backticks, no explanation. The JSON must match this shape exactly: { projectName: string, description: string, tagline: string, stack: string[], installCommand: string, runCommand: string, notes: string[], files: [{ path: string, content: string }] }. Include at least these files: package.json, app/layout.tsx, app/page.tsx, app/globals.css, app/api/ai/route.ts, README.md. Make the code valid and copy-paste ready.",
        },
        {
          role: "user",
          content: [
            `Build a downloadable app project from this prompt: ${prompt}`,
            "",
            "Theme hints:",
            `- projectName: ${theme.projectName}`,
            `- description: ${theme.description}`,
            `- tagline: ${theme.tagline}`,
            `- headline: ${theme.headline}`,
            `- hudLabel: ${theme.hudLabel}`,
            `- hudDirection: ${theme.hudDirection}`,
            `- hudDistance: ${theme.hudDistance}`,
            `- actions: ${theme.actions.join(", ")}`,
            "",
            "Keep the project clean, premium, and realistic.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const jsonText = extractJsonObject(content);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as GeneratedProject;
    if (!parsed || !Array.isArray(parsed.files) || !parsed.files.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();

  if (!prompt) {
    const fallback = createFallbackProject("smart glasses app");
    return NextResponse.json({
      project: fallback,
      source: "fallback",
      warning: "Prompt is empty",
    });
  }

  const theme = detectTheme(prompt);

  try {
    const groqProject = await generateWithGroq(prompt, theme);
    if (groqProject) {
      return NextResponse.json({
        project: groqProject,
        source: "groq",
      });
    }
  } catch {
    // ignore and fall back
  }

  const fallback = createFallbackProject(prompt);
  return NextResponse.json({
    project: fallback,
    source: "fallback",
    warning: "Using fallback generator",
  });
}
