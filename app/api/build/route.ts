import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Blueprint = {
  title: string;
  description: string;
  mode: "navigation" | "scan" | "camera" | "assistant" | "custom";
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
    mode: "custom",
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
    actions: ["Connect device", "Render HUD", "Export JSON"],
    status: "fallback",
  };
}

const blueprintSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "mode",
    "hud",
    "features",
    "actions",
    "status",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    mode: {
      type: "string",
      enum: ["navigation", "scan", "camera", "assistant", "custom"],
    },
    hud: {
      type: "object",
      additionalProperties: false,
      required: ["direction", "distance", "label"],
      properties: {
        direction: {
          type: "string",
          enum: ["left", "right", "up", "down"],
        },
        distance: { type: "number" },
        label: { type: "string" },
      },
    },
    features: {
      type: "array",
      items: { type: "string" },
    },
    actions: {
      type: "array",
      items: { type: "string" },
    },
    status: { type: "string" },
  },
} as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json(
      {
        blueprint: fallbackBlueprint(""),
        source: "fallback",
        warning: "Prompt is empty",
      },
      { status: 200 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        blueprint: fallbackBlueprint(prompt),
        source: "fallback",
        warning: "GROQ_API_KEY is missing",
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0.2,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "halo_blueprint",
              strict: true,
              schema: blueprintSchema,
            },
          },
          messages: [
            {
              role: "system",
              content:
                "You are a product designer for smart-glasses apps. Return only JSON that matches the schema exactly. Make the result concrete, useful, and easy to turn into a real app.",
            },
            {
              role: "user",
              content: [
                "Build a blueprint from this prompt:",
                prompt,
                "",
                "Make the app practical and specific.",
                "Prefer a short title, a clear HUD label, realistic actions, and features that a developer can actually build.",
              ].join("\n"),
            },
          ],
        }),
      }
    );

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

    let parsed: Blueprint | null = null;
    try {
      parsed = JSON.parse(content) as Blueprint;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json(
        {
          blueprint: fallbackBlueprint(prompt),
          source: "fallback",
          warning: "AI returned invalid JSON",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        blueprint: parsed,
        source: "groq",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        blueprint: fallbackBlueprint(prompt),
        source: "fallback",
        warning: "AI request crashed",
      },
      { status: 200 }
    );
  }
}
