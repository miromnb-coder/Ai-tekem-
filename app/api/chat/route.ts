import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Project = {
  projectName?: string;
  description?: string;
  tagline?: string;
  notes?: string[];
  files?: { path: string; content: string }[];
};

function fallbackReply(messages: ChatMessage[], project?: Project) {
  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  if (!lastUser) {
    return "Tell me what you want to improve, and I will help.";
  }

  const name = project?.projectName ?? "the app";
  return `For ${name}, I would keep the UI minimal, make the main action obvious, and add one feature at a time. You asked: ${lastUser}`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    project?: Project;
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
      reply: "Tell me what you want to improve.",
      source: "fallback",
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: fallbackReply(messages, body.project),
      source: "fallback",
      warning: "GROQ_API_KEY is missing",
    });
  }

  try {
    const context = body.project
      ? [
          `Current project name: ${body.project.projectName ?? "Unknown"}`,
          `Description: ${body.project.description ?? "Unknown"}`,
          `Tagline: ${body.project.tagline ?? "Unknown"}`,
          `Notes: ${(body.project.notes ?? []).join(" | ")}`,
          `Files: ${(body.project.files ?? []).map((file) => file.path).join(", ")}`,
        ].join("\n")
      : "No project loaded yet.";

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
          temperature: 0.35,
          messages: [
            {
              role: "system",
              content:
                "You are Halo Copilot. Help the user improve a smart glasses app generator. Be concise, practical, and specific. If the user asks for UI improvements, suggest exact changes. If they ask for code, give copy-paste friendly code. Keep replies short and useful.",
            },
            {
              role: "system",
              content: context,
            },
            ...messages.slice(-12),
          ],
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        reply: fallbackReply(messages, body.project),
        source: "fallback",
        warning: "Groq request failed",
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      reply: reply || fallbackReply(messages, body.project),
      source: "groq",
    });
  } catch {
    return NextResponse.json({
      reply: fallbackReply(messages, body.project),
      source: "fallback",
      warning: "AI request crashed",
    });
  }
}
