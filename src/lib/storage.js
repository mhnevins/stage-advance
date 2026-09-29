/*
 * Per-user key/value storage, backed by the Supabase `kv_user` table
 * (owner_id, key, value) with RLS scoped to auth.uid(). Used for the
 * engineer's own `shows` list.
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
      .select("value, updated_at")
      .eq("owner_id", ownerId)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value, updatedAt: data.updated_at };
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
   * Conditional write — guards against the multi-device/multi-tab
   * clobber bug found 2026-09-29: a tab that loaded a stale copy of
   * this key must not blindly overwrite a newer copy written elsewhere
   * in the meantime. `expectedUpdatedAt` is whatever `get()` (or a
   * prior `setIfUnchanged()`) last reported for this key — pass `null`
   * only when no row was found yet (a first-ever save).
   *
   * Returns { ok: true, updatedAt } on success, or { ok: false } if
   * someone else's write won the race — the caller must NOT retry with
   * the same stale data; it should surface that to the user instead.
   */
  async setIfUnchanged(key, value, expectedUpdatedAt) {
    const supabase = requireSupabase();
    const ownerId = await currentUserId();
    if (!ownerId) throw new Error("Not signed in.");
    const nowIso = new Date().toISOString();

    if (expectedUpdatedAt == null) {
      // No row existed as of our last read — plain insert. If another
      // tab already created this row in the meantime, the (owner_id,
      // key) primary key collides and we report that as a conflict too,
      // rather than silently upserting over it.
      const { data, error } = await supabase
        .from("kv_user")
        .insert({ owner_id: ownerId, key, value, updated_at: nowIso })
        .select("updated_at")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") return { ok: false };
        throw error;
      }
      return { ok: true, updatedAt: data?.updated_at ?? nowIso };
    }

    const { data, error } = await supabase
      .from("kv_user")
      .update({ value, updated_at: nowIso })
      .eq("owner_id", ownerId)
      .eq("key", key)
      .eq("updated_at", expectedUpdatedAt)
      .select("updated_at");
    if (error) throw error;
    if (!data || data.length === 0) return { ok: false };
    return { ok: true, updatedAt: data[0].updated_at };
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
