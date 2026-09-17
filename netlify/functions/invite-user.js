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

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
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
