/*
 * Each engineer's mic/DI locker, stored as real rows in
 * `inventory_items` (owner_id, label, qty) rather than a JSON blob —
 * Phase 2 adds per-item add/edit/remove UI on top of this. For now
 * App.jsx just needs the whole locker reduced into the same
 * `{ label: qty }` shape the rendering code already expects.
 */

import { requireSupabase } from "./supabaseClient";

export async function loadMyInventory() {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data, error } = await supabase
    .from("inventory_items")
    .select("label, qty")
    .eq("owner_id", user.id);
  if (error) throw error;
  const inventory = {};
  (data || []).forEach((row) => { inventory[row.label] = row.qty; });
  return inventory;
}
