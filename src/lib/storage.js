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
