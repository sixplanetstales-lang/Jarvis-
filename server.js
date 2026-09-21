import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const frontendOrigin = process.env.FRONTEND_ORIGIN || `http://localhost:${port}`;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: frontendOrigin, methods: ["GET", "POST"] }));
app.use(express.json({ limit: "128kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: "gemini", model });
});

function normalizeMessages(messages = []) {
  return messages
    .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .slice(-30)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content.slice(0, 20_000) }]
    }));
}

app.post("/api/chat", async (req, res) => {
  const { messages, systemPrompt } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: String(systemPrompt || "You are NEXUS, a helpful school assistant.").slice(0, 10_000) }] },
        contents: normalizeMessages(messages),
        generationConfig: { temperature: 0.7 }
      })
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Google Gemini." });
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    const status = upstream.status === 429 ? 429 : 502;
    const message = upstream.status === 429
      ? "Daily free limit reached, try again later or switch provider."
      : "Gemini rejected the request. Check the server key and model settings.";
    console.error("Gemini error", upstream.status, detail.slice(0, 500));
    return res.status(status).json({ error: message });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    res.end();
  }
});

// Serve the static NEXUS UI when this repository is run as one app.
app.use(express.static(__dirname));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => {
  console.log(`NEXUS server running at http://localhost:${port}`);
});
