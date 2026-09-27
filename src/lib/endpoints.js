/*
 * Each engineer's endpoint locker (speakers, amps, etc. that outputs
 * patch to), stored as real rows in `endpoint_items` (id, owner_id,
 * label, qty, type). Mirrors inventory.js for the mic/DI locker, minus
 * the AI-lookup/shared-library layer — endpoints are manually tagged,
 * no auto-suggestion. Scoped implicitly by RLS (owner_id = auth.uid()).
 */

import { requireSupabase } from "./supabaseClient";

export async function listMyEndpoints() {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("endpoint_items")
    .select("id, label, qty, type")
    .order("label", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addEndpointItem(label, qty, type = null) {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("endpoint_items")
    .insert({ owner_id: user.id, label, qty, type })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEndpointItem(id, patch) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("endpoint_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeEndpointItem(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("endpoint_items").delete().eq("id", id);
  if (error) throw error;
}
