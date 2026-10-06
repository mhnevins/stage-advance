/*
 * Each engineer's shows, stored as one real row per show in the `shows`
 * table (see supabase/migrations/0005_shows_table.sql) — replaces the
 * old single JSON blob per user, which let a stale tab silently
 * overwrite every show saved elsewhere. Scoped by RLS (owner_id =
 * auth.uid()).
 *
 * `data` is the whole show object exactly as the app builds it; `version`
 * is bumped by a database trigger on every update and is what makes
 * saves safe: a save only succeeds if the row's version is still the
 * one this tab last saw. The queue that uses these (batching, retries,
 * conflict handling) lives in showsSync.js.
 */

import { requireSupabase } from "./supabaseClient";

// getSession() reads the locally cached session — no network round trip
// (getUser() calls the auth server), which matters for debounced saves.
async function currentUserId(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not signed in.");
  return session.user.id;
}

/** All of this user's shows, newest first, plus the version of each. */
export async function listMyShows() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("shows")
    .select("id, data, version")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  return {
    shows: rows.map((r) => ({ ...r.data, id: r.id })),
    baseline: rows.map((r) => ({ id: r.id, version: r.version })),
  };
}

/** Insert a brand-new show. { ok: false } if that id already exists. */
export async function createShow(show) {
  const supabase = requireSupabase();
  const ownerId = await currentUserId(supabase);
  const { data, error } = await supabase
    .from("shows")
    .insert({ owner_id: ownerId, id: show.id, data: show })
    .select("version")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false };
    throw error;
  }
  return { ok: true, version: data.version };
}

/**
 * Save an edited show — only if the row is still at `expectedVersion`.
 * { ok: false } means someone else changed or deleted it meanwhile; the
 * caller must not retry with the same stale copy.
 */
export async function saveShow(show, expectedVersion) {
  const supabase = requireSupabase();
  const ownerId = await currentUserId(supabase);
  const { data, error } = await supabase
    .from("shows")
    .update({ data: show })
    .eq("owner_id", ownerId)
    .eq("id", show.id)
    .eq("version", expectedVersion)
    .select("version");
  if (error) throw error;
  if (!data || data.length === 0) return { ok: false };
  return { ok: true, version: data[0].version };
}

export async function removeShow(id) {
  const supabase = requireSupabase();
  const ownerId = await currentUserId(supabase);
  const { error } = await supabase.from("shows").delete().eq("owner_id", ownerId).eq("id", id);
  if (error) throw error;
}

/** The adapter showsSync.js expects. */
export const showsApi = { create: createShow, save: saveShow, remove: removeShow };
