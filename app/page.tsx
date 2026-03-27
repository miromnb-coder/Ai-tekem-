"use client";

import { useState } from "react";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);

  async function build() {
    const res = await fetch("/api/build", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResult(data);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Halo AI App Builder</h1>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="describe app..."
      />

      <button onClick={build}>Build</button>

      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
