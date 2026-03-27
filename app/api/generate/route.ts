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

function makeProject(prompt: string): GeneratedProject {
  const lower = prompt.toLowerCase();

  const isCamera = lower.includes("camera") || lower.includes("scan");
  const isAssistant =
    lower.includes("assistant") || lower.includes("voice") || lower.includes("chat");
  const isNavigation =
    lower.includes("navigation") || lower.includes("route") || lower.includes("hud");

  let projectName = "Halo Glass App";
  let description = "A premium smart-glasses app starter with a glass overlay.";
  let tagline = "Clean overlay. Fast decisions.";
  let headline = "Glass overlay app";
  let subtitle = "A polished starter that can become navigation, assistant, or scan mode.";
  let hudLabel = "Preview ready";
  let hudDirection: "left" | "right" | "up" | "down" = "up";
  let hudDistance = 24;
  let actions = ["Open mode", "Refine UI", "Export build"];
  let notes = [
    "Use this as a base template.",
    "Replace the center HUD with your app logic.",
    "You can add AI later.",
  ];

  if (isCamera) {
    projectName = "Halo Camera";
    description = "A camera-first smart glasses app with scan and AI assist.";
    tagline = "See, scan, and understand faster.";
    headline = "Camera-first AR assistant";
    subtitle = "A clean overlay for scanning scenes, capturing moments, and getting AI help.";
    hudLabel = "Scan ready";
    hudDirection = "up";
    hudDistance = 12;
    actions = ["Scan scene", "Capture frame", "Ask AI"];
    notes = [
      "Designed for quick capture.",
      "HUD stays minimal during camera use.",
      "Great base for image AI later.",
    ];
  } else if (isAssistant) {
    projectName = "Halo Assistant";
    description = "A conversational smart glasses assistant with text and quick actions.";
    tagline = "Talk naturally. Get useful answers.";
    headline = "Wearable assistant";
    subtitle = "Built for quick replies, short prompts, and an always-visible HUD.";
    hudLabel = "Assistant online";
    hudDirection = "right";
    hudDistance = 0;
    actions = ["Ask question", "Quick reply", "Open notes"];
    notes = [
      "Conversation is the main surface.",
      "Keep replies short on the glasses.",
      "Works well with chat AI later.",
    ];
  } else if (isNavigation) {
    projectName = "Halo Navigation";
    description = "A minimal navigation HUD with direction and distance.";
    tagline = "Small overlay. Clear guidance.";
    headline = "Navigation HUD";
    subtitle = "One arrow, one distance, one clear next action.";
    hudLabel = "Route locked";
    hudDirection = "right";
    hudDistance = 42;
    actions = ["Start route", "Recenter", "Voice guide"];
    notes = [
      "Best for minimal glasses UI.",
      "Keep text small and readable.",
      "Direction should update live.",
    ];
  }

  const files: ProjectFile[] = [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
      ),
    },
    {
      path: "app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(projectName)},
  description: ${JSON.stringify(description)},
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
}`,
    },
    {
      path: "app/page.tsx",
      content: `"use client";

import { useEffect, useState } from "react";

const APP_NAME = ${JSON.stringify(projectName)};
const HEADLINE = ${JSON.stringify(headline)};
const SUBTITLE = ${JSON.stringify(subtitle)};
const HUD_LABEL = ${JSON.stringify(hudLabel)};
const HUD_DIRECTION = ${JSON.stringify(hudDirection)};
const START_DISTANCE = ${hudDistance};
const ACTIONS = ${JSON.stringify(actions)};

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
}`,
    },
    {
      path: "app/globals.css",
      content: `:root {
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
}`,
    },
    {
      path: "app/api/ai/route.ts",
      content: `import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  return NextResponse.json({
    reply: prompt
      ? \`For ${projectName}, focus on ${hudLabel.toLowerCase()} and keep the UI minimal. You asked: \${prompt}\`
      : \`Start with ${projectName}. Keep the HUD minimal and one action per screen.\`,
  });
}`,
    },
    {
      path: "README.md",
      content: `# ${projectName}

${description}

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## Notes

${notes.map((note) => `- ${note}`).join("\n")}
`,
    },
  ];

  return {
    projectName,
    description,
    tagline,
    stack: ["Next.js", "TypeScript", "React"],
    installCommand: "npm install",
    runCommand: "npm run dev",
    notes,
    files,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  const project = makeProject(prompt);

  return NextResponse.json({
    project,
    source: "fallback",
    warning: prompt ? undefined : "Prompt was empty, using default project.",
  });
}
