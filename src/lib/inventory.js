/*
 * Each engineer's mic/DI locker, stored as real rows in
 * `inventory_items` (id, owner_id, label, qty). Scoped implicitly by
 * RLS (owner_id = auth.uid()) — no explicit filtering needed here.
 */

import { requireSupabase } from "./supabaseClient";

export async function listMyInventory() {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, label, qty")
    .order("label", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addInventoryItem(label, qty) {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ owner_id: user.id, label, qty })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id, patch) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeInventoryItem(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}
