/*
 * Approves an access request by actually creating the account: calls
 * Supabase Auth's admin inviteUserByEmail, which creates the user and
 * emails them a sign-in link. This is the one step in the access-request
 * flow that genuinely needs the service-role key (admin.* calls aren't
 * available to the anon client) — everything else (submitting a request,
 * reading/deciding requests) goes straight through Supabase RLS.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY as a Netlify environment variable.
 * ADMIN_EMAIL must match the hardcoded admin email in
 * supabase/migrations/0003_access_requests.sql and src/App.jsx.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wtarcntxmlkiutxansyo.supabase.co"; // not sensitive — same URL already public in the client bundle
const ADMIN_EMAIL = "me@michaelnevins.com";
// Explicit, not left to Supabase's dashboard "Site URL" setting — that
// setting still needs to be correct for other auth emails, but this
// invite link no longer depends on it matching (2026-09-28: it didn't,
// and invites redirected to localhost).
const SITE_URL = "https://inputlistmanager.com";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
  }

  let email;
  try {
    ({ email } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }
  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "email is required" }), { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server not configured." }), { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Not authorized." }), { status: 403 });
    }

    const invite = async () => admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL });
    let { error: inviteErr } = await invite();

    if (inviteErr && /already.*(registered|exists)/i.test(inviteErr.message || "")) {
      // The address already has an auth user — could be someone who
      // genuinely already has a working account (fine, nothing to do),
      // or a stale invite stuck from an earlier attempt that never got
      // completed (e.g. the localhost-redirect bug from 2026-09-28,
      // which left invited-but-unconfirmed users behind). Only the
      // second case should actually block a fresh invite, so look the
      // user up and decide instead of guessing from the error text alone.
      // listUsers() returns one page (no pagination handled) — fine at
      // this project's current user count, revisit if that changes.
      const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw inviteErr;
      const existing = usersPage?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existing && !existing.email_confirmed_at) {
        const { error: deleteErr } = await admin.auth.admin.deleteUser(existing.id);
        if (deleteErr) throw inviteErr;
        ({ error: inviteErr } = await invite());
      } else if (existing) {
        inviteErr = null; // already has a real, confirmed account — nothing to send
      }
    }
    if (inviteErr) throw inviteErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err?.message || "Couldn't send the invite.",
    }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
};
