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

    // Temporary diagnostic trail (2026-09-28) — this flow has failed
    // silently twice already on wrong assumptions, so every attempt now
    // reports exactly what it saw and did at each step, returned to the
    // caller regardless of outcome. Strip this out once the invite path
    // is confirmed reliable.
    const debug = { step: "initial-invite" };

    const invite = async () => admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL });
    let { error: inviteErr } = await invite();
    debug.initialInviteError = inviteErr?.message || null;

    if (inviteErr && /already.*(registered|exists)/i.test(inviteErr.message || "")) {
      debug.step = "duplicate-detected";
      // The address already has an auth user — could be someone who
      // genuinely already has a working account (fine, nothing to do),
      // or a stale invite stuck from an earlier attempt that never got
      // completed (e.g. the localhost-redirect bug from 2026-09-28,
      // which left invited users behind who never actually signed in).
      // Only the second case should actually block a fresh invite, so
      // look the user up and decide instead of guessing from the error
      // text alone. Checking last_sign_in_at, not email_confirmed_at —
      // inviteUserByEmail marks the email confirmed immediately (that's
      // Supabase vouching for the address, not the person completing
      // anything), so that flag can't tell a stale invite apart from a
      // real account. Never having signed in actually can.
      // listUsers() returns one page (no pagination handled) — fine at
      // this project's current user count, revisit if that changes.
      const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers();
      debug.listUsersError = listErr?.message || null;
      debug.totalUsersOnPage = usersPage?.users?.length ?? null;
      if (listErr) throw inviteErr;
      const existing = usersPage?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      debug.existingFound = Boolean(existing);
      if (existing) {
        debug.existing = {
          id: existing.id,
          email: existing.email,
          created_at: existing.created_at,
          last_sign_in_at: existing.last_sign_in_at,
          email_confirmed_at: existing.email_confirmed_at,
        };
      }

      if (existing && !existing.last_sign_in_at) {
        debug.step = "deleting-stale-user";
        const { error: deleteErr } = await admin.auth.admin.deleteUser(existing.id);
        debug.deleteError = deleteErr?.message || null;
        if (deleteErr) throw inviteErr;
        debug.step = "retry-invite";
        ({ error: inviteErr } = await invite());
        debug.retryInviteError = inviteErr?.message || null;
      } else if (existing) {
        debug.step = "treated-as-real-account";
        inviteErr = null; // has actually signed in before — real account, nothing to send
      }
    }
    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message, debug }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, debug }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err?.message || "Couldn't send the invite.",
    }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
};
