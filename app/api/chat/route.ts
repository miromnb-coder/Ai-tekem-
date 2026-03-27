import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

function fallbackReply(messages: ChatMessage[], blueprint?: Blueprint) {
  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  if (!lastUser) {
    return "Ask me what to build, or ask me how to improve the current app.";
  }

  const title = blueprint?.title ?? "the app";
  return `I can help refine ${title}. A strong next step is to keep the HUD minimal, make the main action obvious, and only add one extra feature at a time.`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    blueprint?: Blueprint;
  };

  const messages = Array.isArray(body.messages)
    ? body.messages.filter(
        (message): message is ChatMessage =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )
    : [];

  if (!messages.length) {
    return NextResponse.json({
      reply: "Tell me what you want to build, and I will help.",
      source: "fallback",
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: fallbackReply(messages, body.blueprint),
      source: "fallback",
      warning: "GROQ_API_KEY is missing",
    });
  }

  try {
    const context =
      body.blueprint
        ? `Current blueprint JSON:\n${JSON.stringify(body.blueprint, null, 2)}`
        : "No blueprint yet.";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are Halo Copilot. You help the user build smart-glasses apps. Be warm, practical, and concise. If the user asks for code, give copy-paste code. If the user asks for improvements, give exact changes. Ask one short clarifying question when needed.",
            },
            {
              role: "system",
              content: context,
            },
            ...messages,
          ],
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        reply: fallbackReply(messages, body.blueprint),
        source: "fallback",
        warning: "Groq request failed",
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      reply: reply || fallbackReply(messages, body.blueprint),
      source: "groq",
    });
  } catch {
    return NextResponse.json({
      reply: fallbackReply(messages, body.blueprint),
      source: "fallback",
      warning: "AI request crashed",
    });
  }
}
