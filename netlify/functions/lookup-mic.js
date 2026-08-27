/*
 * Stateless AI lookup for an unrecognized mic/DI. Given a label, asks
 * Claude Haiku to classify it (type, phantom power, typical use cases)
 * and returns that as JSON. Never touches Supabase — the caller is
 * responsible for caching the result into mic_library and saving it to
 * their own inventory_items row, using their own authenticated session.
 *
 * Requires ANTHROPIC_API_KEY as a Netlify environment variable. Nothing
 * else — this function has no Supabase awareness at all.
 */

import Anthropic from "@anthropic-ai/sdk";

const USE_CASES = [
  "kick", "snare", "toms", "hi-hat", "overhead", "percussion",
  "bass-di", "bass-amp", "guitar-amp", "acoustic-guitar", "keys",
  "strings", "horn", "lead-vocal", "backing-vocal", "playback",
  "di-passive", "di-active",
];

const client = new Anthropic();

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let label;
  try {
    ({ label } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }
  if (!label || typeof label !== "string" || !label.trim()) {
    return new Response(JSON.stringify({ error: "label is required" }), { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      tools: [{
        name: "classify_mic",
        description: "Classify a microphone or DI box model for a live sound input list app.",
        input_schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["dynamic", "condenser", "ribbon", "di-active", "di-passive"] },
            needs_phantom: { type: "boolean" },
            use_cases: { type: "array", items: { type: "string", enum: USE_CASES }, maxItems: 4 },
          },
          required: ["type", "needs_phantom", "use_cases"],
          additionalProperties: false,
        },
        strict: true,
      }],
      tool_choice: { type: "tool", name: "classify_mic" },
      messages: [{
        role: "user",
        content: `Classify this microphone or DI box for a live sound input list app: "${label}". Pick 1-3 typical use cases from the allowed list that best fit how this model is normally used on stage.`,
      }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse) {
      return new Response(JSON.stringify({ error: "No classification returned" }), { status: 502 });
    }

    return new Response(JSON.stringify({
      type: toolUse.input.type,
      needsPhantom: toolUse.input.needs_phantom,
      useCases: toolUse.input.use_cases,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Lookup failed",
      detail: err?.message || String(err),
      name: err?.name,
      status: err?.status,
    }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
};
