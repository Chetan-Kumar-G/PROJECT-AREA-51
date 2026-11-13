// Cloudflare Worker: a small, locked-down proxy between the "Ask the Archive"
// page and Google's Gemini API. It keeps the API key secret, only answers questions
// about this project, and streams the answer back as plain text.
import { KNOWLEDGE } from "./knowledge.js";

// Model and API address can be changed in wrangler.toml [vars] without touching this file.
const DEFAULT_MODEL = "gemini-flash-lite-latest";   // Google's alias for its current Flash-Lite model: fast, less busy
const DEFAULT_FALLBACKS = "gemini-flash-latest"; // backup when the main model is busy
const DEFAULT_API = "https://generativelanguage.googleapis.com/v1beta";
const MAX_TURNS = 12;          // messages kept from the conversation
const MAX_USER_CHARS = 800;    // longest question accepted
const MAX_ASSISTANT_CHARS = 4000;

const SYSTEM_PROMPT = `You are the Archive Guide for "Ghosts of Exploration", a website made for the NASA Space Apps Challenge 2026 about the hardware NASA left on the Moon, on Mars and in deep space. Most visitors are students aged 8 to 14, plus teachers and parents.

How to answer:
- Base your answers on the archive below. Every machine with a "###" heading is in the archive, so answer about it directly, with no disclaimer. Only if a question needs facts the archive doesn't contain may you add well-established facts about NASA missions and space science, briefly mentioning they come from outside this archive, and only if you are confident they are accurate. If you don't know, say so and suggest a related machine they can explore.
- General space science questions (planets, moons, stars, black holes, how rockets work) are welcome: answer them briefly and simply, and link back to a machine in the archive when one fits.
- For questions that aren't about space at all, don't mention the archive: just say kindly that you can only help with space exploration.
- Use simple, friendly words and short sentences. Keep answers under about 150 words unless the visitor asks for more detail. Use a short bulleted list when listing several things.
- Each machine's "Status" line is the truth about whether it still works: only machines whose Status is "Still working" are still talking today; "Retired" means partly awake; everything else is silent, lost or crashed. Never guess a status.
- When asked to list or count machines, go through the archive and include only the ones that match. Don't add a machine and then correct yourself.
- Always write machine names exactly as they appear in the archive headings (for example "Opportunity", "Lunar Roving Vehicle 3", "Voyager 1") so the website can link them.
- Correct myths gently. For example, "My battery is low and it's getting dark" was a journalist's summary of Opportunity's final data, not a real message.
- If asked to speak as one of the machines, you may answer in a playful first-person voice like the archive's ghost logs, but keep every fact accurate.
- Distances for deep-space probes are estimates: use the archive's 1 January 2025 distance plus the yearly rate and the date given at the start of the latest message, and say it is an estimate.
- Stay on topic: space, NASA and planetary missions, the machines in the archive, and how they worked. For anything else, kindly say you can only help with space exploration and suggest a question.
- Never ask for personal information such as names, ages, schools or locations. If a visitor shares some, don't repeat it.
- Format with plain text and simple markdown only: **bold**, bullet lists starting with "- ", and line breaks. No tables, headings or links.

${KNOWLEDGE}`;

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    ...(ok ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    _ok: ok,
  };
}

function json(status, body, headers) {
  const { _ok, ...h } = headers;
  return new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });
}

// Accept only a clean, alternating user/assistant history that ends with a user question.
function cleanMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const msgs = raw.slice(-MAX_TURNS).map((m) => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: String((m && m.content) || "").trim(),
  }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (!m.content) return null;
    if (i > 0 && m.role === msgs[i - 1].role) return null;
    const limit = m.role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (m.content.length > limit) m.content = m.content.slice(0, limit);
  }
  return msgs;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    const { _ok, ...corsOut } = cors;

    if (request.method === "OPTIONS") return new Response(null, { status: _ok ? 204 : 403, headers: corsOut });
    if (url.pathname === "/health") return json(200, { ok: true }, cors);
    if (request.method !== "POST" || url.pathname !== "/chat") return json(404, { error: "not_found" }, cors);
    if (!_ok) return json(403, { error: "origin_not_allowed" }, cors);
    if (!env.GEMINI_API_KEY) return json(500, { error: "missing_api_key" }, cors);

    // Optional per-visitor rate limit (see wrangler.toml).
    if (env.LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json(429, { error: "rate_limited" }, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json(400, { error: "bad_json" }, cors); }
    const messages = cleanMessages(body && body.messages);
    if (!messages) return json(400, { error: "bad_messages" }, cors);

    // Put today's date in the latest turn (not the system prompt) so the long prefix stays identical
    // between requests, which lets Gemini reuse it (implicit caching).
    const today = new Date().toISOString().slice(0, 10);
    const last = messages[messages.length - 1];
    // The site is in English, Spanish or Hindi: answer in the visitor's language.
    const LANGS = { es: "Spanish (Latin American, simple words for children)", hi: "Hindi (Devanagari script, simple everyday words for school children; keep well-known names like NASA, Apollo and machine names in their usual form)" };
    const langNote = LANGS[body && body.lang] ? `\n[Answer in ${LANGS[body.lang]}.]` : "";
    last.content = `[Today's date: ${today}]${langNote}\n${last.content}`;

    // Try the main model; if Google says it's busy (503) or over the free limit (429),
    // try the backup model(s). Every model has its own free-tier limit.
    const models = [env.GEMINI_MODEL || DEFAULT_MODEL,
      ...String(env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACKS).split(",").map((s) => s.trim()).filter(Boolean)];
    const api = (env.GEMINI_API_BASE || DEFAULT_API).replace(/\/$/, "");
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
    });
    const attempts = models; // a busy model is skipped straight away, so visitors don't wait
    let upstream = null, lastStatus = 0;
    for (let i = 0; i < attempts.length; i++) {
      try {
        upstream = await fetch(`${api}/models/${encodeURIComponent(attempts[i])}:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
          body: payload,
        });
      } catch (err) {
        console.error("Gemini request failed", attempts[i], err);
        upstream = null; lastStatus = 502; continue;
      }
      if (upstream.ok && upstream.body) break;
      lastStatus = upstream.status;
      console.error("Gemini error", attempts[i], upstream.status, (await upstream.text().catch(() => "")).slice(0, 500));
      upstream = null;
      if (![429, 500, 503, 504].includes(lastStatus) && !(lastStatus === 404 && i >= 1)) break; // e.g. a bad key: don't keep trying
    }
    if (!upstream) {
      // The page then falls back to its built-in offline guide.
      const busy = lastStatus === 429 || lastStatus === 503;
      return json(busy ? 429 : 502, { error: busy ? "rate_limited" : "upstream_error" }, cors);
    }

    const encoder = new TextEncoder(), decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const readable = new ReadableStream({
      async start(controller) {
        let wrote = false, finish = "", blocked = false, buf = "";
        const handle = (line) => {
          if (!line.startsWith("data:")) return;
          let chunk;
          try { chunk = JSON.parse(line.slice(5)); } catch { return; }
          if (chunk.promptFeedback && chunk.promptFeedback.blockReason) blocked = true;
          const cand = chunk.candidates && chunk.candidates[0];
          if (!cand) return;
          for (const part of (cand.content && cand.content.parts) || []) {
            if (part.thought || typeof part.text !== "string" || !part.text) continue; // skip the model's private reasoning
            wrote = true;
            controller.enqueue(encoder.encode(part.text));
          }
          if (cand.finishReason) finish = cand.finishReason;
        };
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split(/\r?\n/);
            buf = lines.pop();
            lines.forEach(handle);
          }
          if (buf) handle(buf);
          if (blocked || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"].includes(finish)) {
            controller.enqueue(encoder.encode((wrote ? "\n\n" : "") +
              "Sorry, I can't help with that one. Try asking me about a rover, a lander or a space probe!"));
          } else if (finish === "MAX_TOKENS") {
            controller.enqueue(encoder.encode("…"));
          } else if (!wrote) {
            controller.enqueue(encoder.encode("\u0000ERROR"));
          }
        } catch (err) {
          console.error("stream failed", err);
          controller.enqueue(encoder.encode(wrote
            ? "\n\n(The answer was cut off. Please try again.)"
            : "\u0000ERROR"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { ...corsOut, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  },
};
