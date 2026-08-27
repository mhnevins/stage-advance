/*
 * Shared mic/DI recognition library (mic_library table). Reads are
 * public (harmless reference data); the cache-write after a fresh AI
 * lookup is a normal authenticated client-side insert — no server-side
 * Supabase credentials needed anywhere in this feature.
 */

import { requireSupabase } from "./supabaseClient";

export async function lookupMicLibrary(label) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("mic_library")
    .select("type, needs_phantom, use_cases")
    .ilike("label", label)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cacheMicLibraryEntry(label, tags) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("mic_library").insert({
    label,
    type: tags.type,
    needs_phantom: tags.needsPhantom,
    use_cases: tags.useCases,
    source: "ai",
  });
  if (error && error.code !== "23505") throw error; // ignore races (someone else cached it first)
}

export async function fetchAiTagsForMic(label) {
  const res = await fetch("/.netlify/functions/lookup-mic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error("AI lookup failed");
  return res.json(); // { type, needsPhantom, useCases }
}
