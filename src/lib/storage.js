/*
 * Per-user key/value storage, backed by the Supabase `kv_user` table
 * (owner_id, key, value) with RLS scoped to auth.uid(). Holds small
 * per-account preferences (channel group colors, custom output chips).
 * Shows used to live here too, as one big JSON blob — they now have a
 * real table, see shows.js.
 */

import { requireSupabase } from "./supabaseClient";

const currentUserId = async () => {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

export const storage = {
  async get(key) {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) return null;
    const { data, error } = await supabase
      .from("kv_user")
      .select("value")
      .eq("owner_id", ownerId)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value };
  },

  async set(key, value) {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) throw new Error("Not signed in.");
    const { error } = await supabase
      .from("kv_user")
      .upsert({ owner_id: ownerId, key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value };
  },

  /*
   * Read-modify-write against the SERVER's current copy, never this
   * tab's in-memory one: `mutate(current)` receives the parsed value as
   * it is right now (undefined if none) and returns the new value. The
   * write only lands if the stored value is still exactly what we just
   * read; otherwise someone else wrote in between, so we re-read and
   * re-apply the same change on top of theirs. Net effect: a change
   * made in one tab (say, one group's color) is merged with changes
   * made in other tabs instead of replacing them — a stale tab can no
   * longer wipe out colors set elsewhere. Returns the merged value that
   * was saved.
   */
  async update(key, mutate, { retries = 4 } = {}) {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) throw new Error("Not signed in.");

    for (let attempt = 0; attempt <= retries; attempt++) {
      const { data: row, error: readErr } = await supabase
        .from("kv_user")
        .select("value")
        .eq("owner_id", ownerId)
        .eq("key", key)
        .maybeSingle();
      if (readErr) throw readErr;

      let current;
      try { current = row ? JSON.parse(row.value) : undefined; } catch { current = undefined; }
      const nextValue = JSON.stringify(mutate(current));

      if (!row) {
        const { error } = await supabase
          .from("kv_user")
          .insert({ owner_id: ownerId, key, value: nextValue });
        if (!error) return JSON.parse(nextValue);
        if (error.code !== "23505") throw error; // another tab created it first — re-read and merge
      } else {
        const { data, error } = await supabase
          .from("kv_user")
          .update({ value: nextValue, updated_at: new Date().toISOString() })
          .eq("owner_id", ownerId)
          .eq("key", key)
          .eq("value", row.value) // only if nobody changed it since we read it
          .select("key");
        if (error) throw error;
        if (data && data.length > 0) return JSON.parse(nextValue);
      }
    }
    throw new Error("Couldn't save — please try again.");
  },

  async delete(key) {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) return { key, deleted: false };
    const { error } = await supabase
      .from("kv_user")
      .delete()
      .eq("owner_id", ownerId)
      .eq("key", key);
    if (error) throw error;
    return { key, deleted: true };
  },

  async list(prefix = "") {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) return { keys: [], prefix };
    const { data, error } = await supabase
      .from("kv_user")
      .select("key")
      .eq("owner_id", ownerId)
      .like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix };
  },
};
