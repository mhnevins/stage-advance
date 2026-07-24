/*
 * Drop-in replacement for the Claude-artifact `window.storage` API.
 *
 * `shared: false` (the Planner's own shows) stays in localStorage — that
 * data only ever needs to be visible on your own device.
 *
 * `shared: true` (the Band Form submissions inbox) is backed by a
 * Supabase table (`kv_shared`) so a band leader's submission from their
 * own phone/device actually reaches your inbox. See README for the
 * Supabase project setup and required env vars.
 */

import { createClient } from "@supabase/supabase-js";

const NAMESPACE = "stage-advance";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const k = (key) => `${NAMESPACE}:local:${key}`;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "Shared storage needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (see README)."
    );
  }
  return supabase;
};

export const storage = {
  async get(key, shared = false) {
    if (shared) {
      const { data, error } = await requireSupabase()
        .from("kv_shared")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { key, value: data.value, shared };
    }
    const raw = localStorage.getItem(k(key));
    if (raw === null) return null;
    return { key, value: raw, shared };
  },

  async set(key, value, shared = false) {
    if (shared) {
      const { error } = await requireSupabase()
        .from("kv_shared")
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { key, value, shared };
    }
    localStorage.setItem(k(key), value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    if (shared) {
      const { error } = await requireSupabase().from("kv_shared").delete().eq("key", key);
      if (error) throw error;
      return { key, deleted: true, shared };
    }
    const existed = localStorage.getItem(k(key)) !== null;
    localStorage.removeItem(k(key));
    return { key, deleted: existed, shared };
  },

  async list(prefix = "", shared = false) {
    if (shared) {
      const { data, error } = await requireSupabase()
        .from("kv_shared")
        .select("key")
        .like("key", `${prefix}%`);
      if (error) throw error;
      return { keys: (data || []).map((r) => r.key), prefix, shared };
    }
    const full = `${NAMESPACE}:local:${prefix}`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const stored = localStorage.key(i);
      if (stored && stored.startsWith(full)) {
        keys.push(stored.slice(`${NAMESPACE}:local:`.length));
      }
    }
    return { keys, prefix, shared };
  },
};
