import Groq from "groq-sdk";

export const runtime = "nodejs";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create simple JSON app: ${prompt}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0].message.content;

    return Response.json({ result: text });
  } catch (e) {
    return Response.json({ error: "AI failed" });
  }
}
