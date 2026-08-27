/*
 * Deletes the calling user's own account, permanently and immediately.
 * Every user-owned table has `references auth.users(id) on delete
 * cascade` (see supabase/migrations/0001_multi_tenant.sql), so removing
 * the auth user here cascades to profiles/kv_user/inventory_items/
 * submissions automatically — nothing else to clean up.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY as a Netlify environment variable.
 * This key bypasses every RLS policy in the project — never expose it
 * client-side, and this function only ever uses it to (a) verify who's
 * calling via their own access token, then (b) delete exactly that
 * user, never an id the client could claim.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wtarcntxmlkiutxansyo.supabase.co"; // not sensitive — same URL already public in the client bundle

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server not configured." }), { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session." }), { status: 401 });
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Couldn't delete account.",
      detail: err?.message || String(err),
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
