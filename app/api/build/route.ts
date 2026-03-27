import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function fallbackBlueprint(prompt: string): Blueprint {
  const lower = prompt.toLowerCase();
  const direction: "left" | "right" | "up" | "down" = lower.includes("left")
    ? "left"
    : lower.includes("right")
      ? "right"
      : lower.includes("down")
        ? "down"
        : "up";

  return {
    title: "Fallback Blueprint",
    description: prompt || "No prompt provided.",
    mode: "fallback",
    hud: {
      direction,
      distance: 42,
      label: "Preview ready",
    },
    features: [
      "HUD preview",
      "Prompt-to-blueprint generation",
      "Device adapter ready",
    ],
    actions: [
      "Connect device",
      "Render HUD",
      "Export JSON",
    ],
    status: "fallback",
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt ?? "";

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      blueprint: fallbackBlueprint(prompt),
      source: "fallback",
      warning: "GROQ_API_KEY is missing",
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              "Return ONLY valid JSON with keys: title, description, mode, hud, features, actions, status. hud must contain direction, distance, label.",
          },
          {
            role: "user",
            content: `Build an app blueprint from this prompt: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          blueprint: fallbackBlueprint(prompt),
          source: "fallback",
          warning: "Groq request failed",
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    let parsed: Blueprint;

    try {
      parsed = JSON.parse(content) as Blueprint;
    } catch {
      parsed = fallbackBlueprint(prompt);
    }

    return NextResponse.json({
      blueprint: parsed,
      source: "groq",
    });
  } catch {
    return NextResponse.json({
      blueprint: fallbackBlueprint(prompt),
      source: "fallback",
    });
  }
}
