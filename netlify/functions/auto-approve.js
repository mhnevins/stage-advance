/*
 * Automatic approval of a just-submitted access request. The request form
 * calls this right after inserting the request row; if the guardrails in
 * netlify/lib/autoApprove.js pass, the person is invited immediately,
 * otherwise the request just stays pending for manual review.
 *
 * Public endpoint on purpose (the requester has no account yet), which is
 * why it trusts nothing from the caller beyond an email address: it only
 * acts on a request row that already exists, is still pending and was
 * created in the last few minutes. See autoApprove.js for the rest.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY (already set for invite-user) and,
 * optionally, SLACK_WEBHOOK_URL (already set for notify-access-request).
 * Kill switch: app_settings.auto_approve — see migration 0007.
 */

import { createClient } from "@supabase/supabase-js";
import { decideAutoApproval } from "../lib/autoApprove.js";
import { inviteOrRepair } from "../lib/inviteUser.js";

const SUPABASE_URL = "https://wtarcntxmlkiutxansyo.supabase.co"; // same public URL as invite-user.js
const SITE_URL = "https://inputlistmanager.com"; // see the note in invite-user.js

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function makeStore(admin) {
  return {
    async getSetting(key) {
      const { data, error } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    async findRequest(email) {
      const { data, error } = await admin
        .from("access_requests")
        .select("id, status, created_at, first_name, last_name")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async countApproved({ sinceMs, autoOnly }) {
      let q = admin
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("decided_at", new Date(Date.now() - sinceMs).toISOString());
      if (autoOnly) q = q.eq("auto_approved", true);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
    async claim(id) {
      const { data, error } = await admin
        .from("access_requests")
        .update({ status: "approved", decided_at: new Date().toISOString(), auto_approved: true })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error) throw error;
      return Array.isArray(data) && data.length === 1;
    },
    async release(id) {
      const { error } = await admin
        .from("access_requests")
        .update({ status: "pending", decided_at: null, auto_approved: false })
        .eq("id", id);
      if (error) throw error;
    },
    invite: (email) => inviteOrRepair(admin, email, SITE_URL),
    async notify(text) {
      const url = process.env.SLACK_WEBHOOK_URL;
      if (!url) return;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } catch { /* best effort */ }
    },
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return json({ approved: false });

  const admin = createClient(SUPABASE_URL, serviceRoleKey);
  const result = await decideAutoApproval({
    email: body?.email,
    elapsedMs: body?.elapsedMs,
    store: makeStore(admin),
  });
  // Only the yes/no goes back to the browser — no hints about which
  // guardrail tripped.
  return json({ approved: result.approved });
};
