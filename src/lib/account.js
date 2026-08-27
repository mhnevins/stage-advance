/*
 * "Your data" account controls (Phase 5): export everything a signed-in
 * user can already read, or delete the account entirely.
 *
 * Export is pure client-side — no new secrets or endpoints, just the
 * existing read functions assembled into one JSON download.
 *
 * Deletion can't be done with the anon key: only an admin-level call
 * can remove a user's actual login, so this posts to a Netlify Function
 * that holds the service-role key server-side. Every user-owned table
 * was defined with `references auth.users(id) on delete cascade`
 * (see supabase/migrations/0001_multi_tenant.sql), so deleting the auth
 * user there cascades to profiles/kv_user/inventory_items/submissions
 * automatically — this file doesn't need to clean those up itself.
 */

import { requireSupabase } from "./supabaseClient";
import { storage } from "./storage";
import { listMyInventory } from "./inventory";
import { listMine as listMySubmissions } from "./submissions";

const SHOWS_STORAGE_KEY = "stage-advance:shows"; // must match STORAGE_KEY in App.jsx

export async function exportMyData() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [inventory, showsRow, submissions, profileResult] = await Promise.all([
    listMyInventory(),
    storage.get(SHOWS_STORAGE_KEY),
    listMySubmissions(),
    client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    profile: profileResult.data,
    inventory,
    shows: showsRow?.value ? JSON.parse(showsRow.value) : [],
    submissions,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stageadvance-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteMyAccount() {
  const client = requireSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const res = await fetch("/.netlify/functions/delete-account", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't delete your account.");
  }
}
