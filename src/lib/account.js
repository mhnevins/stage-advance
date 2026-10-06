/*
 * "Your data" account controls (Phase 5): export everything a signed-in
 * user can already read, or delete the account entirely.
 *
 * Export is pure client-side — no new secrets or endpoints, just the
 * existing read functions assembled into one JSON download. It is the
 * user's backup: keep it complete (shows, mic locker, endpoint
 * inventory, channel colors, output chips) when adding new per-user data.
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
import { listMyEndpoints } from "./endpoints";
import { listMyShows } from "./shows";
import { listMine as listMySubmissions } from "./submissions";
import { BACKUP_FORMAT, BACKUP_VERSION } from "./restore";

// Must match GROUP_COLORS_KEY / OUTPUT_CHIPS_KEY in App.jsx.
const GROUP_COLORS_KEY = "stage-advance:group-colors";
const OUTPUT_CHIPS_KEY = "stage-advance:output-chips";

const parseOr = (row, fallback) => {
  try { return row?.value ? JSON.parse(row.value) : fallback; } catch { return fallback; }
};

export async function exportMyData() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [inventory, endpoints, showsResult, colorsRow, chipsRow, submissions, profileResult] = await Promise.all([
    listMyInventory(),
    listMyEndpoints(),
    listMyShows(),
    storage.get(GROUP_COLORS_KEY),
    storage.get(OUTPUT_CHIPS_KEY),
    listMySubmissions(),
    client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  // Everything a user could lose hours of careful setup on goes in here:
  // shows, mic locker, endpoint inventory, and their colors/output chips.
  const data = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profileResult.data,
    inventory,
    endpoints,
    shows: showsResult.shows,
    settings: {
      groupColors: parseOr(colorsRow, {}),
      customOutputChips: parseOr(chipsRow, []),
    },
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
