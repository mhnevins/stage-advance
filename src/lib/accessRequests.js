/*
 * Access-request gate: public submission + admin review, replacing open
 * self-serve signup (see useAuth.js's shouldCreateUser:false). Submission
 * and admin read/update both go straight through Supabase (RLS enforces
 * who can do what — see supabase/migrations/0003_access_requests.sql).
 * Only actually creating the account (the Supabase Auth admin invite
 * call) needs a service-role key, so that alone goes through a Netlify
 * Function.
 */

import { requireSupabase } from "./supabaseClient";

export const SOURCE_OPTIONS = [
  { value: "google", label: "Google search" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Referred by a friend/colleague" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "ai", label: "AI assistant (ChatGPT, Claude, etc.)" },
  { value: "other", label: "Other" },
];

export async function submitAccessRequest({
  firstName, lastName, email, company, source, sourceOther, referredBy, about, marketingConsent,
}) {
  const client = requireSupabase();
  const { error } = await client.from("access_requests").insert({
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: email.trim().toLowerCase(),
    company: company?.trim() || null,
    source,
    source_other: source === "other" ? (sourceOther?.trim() || null) : null,
    referred_by: source === "referral" ? (referredBy?.trim() || null) : null,
    about: about?.trim() || null,
    marketing_consent: Boolean(marketingConsent),
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "You've already submitted a request with this email. If it's been a while or your " +
        "situation has changed, feel free to reach out directly at support@kickandsnare.llc " +
        "and we'll take another look."
      );
    }
    throw new Error("Couldn't submit your request — please try again.");
  }

  // Best-effort Slack ping — never blocks or fails the request itself.
  // 404s harmlessly under plain `vite dev` (no Netlify Functions server);
  // works once deployed.
  fetch("/.netlify/functions/notify-access-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, company, source, sourceOther, referredBy }),
  }).catch(() => {});
}

export async function listAccessRequests() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("access_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function decideAccessRequest(id, decision, email) {
  const client = requireSupabase();

  if (decision === "approve") {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("Not signed in.");
    const res = await fetch("/.netlify/functions/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      // invite-user.js already resolves the "already registered" case
      // itself (distinguishing a real existing account from a stale,
      // never-completed invite) — anything it still returns as an error
      // here is a genuine failure, not something to paper over.
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Couldn't send the invite.");
    }
  }

  const { error } = await client
    .from("access_requests")
    .update({ status: decision === "approve" ? "approved" : "declined", decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/* Sends a decided request back to "pending" so it can go through
   Approve/Decline again — e.g. a decline made in error, or an approval
   whose invite needs retrying. No dedicated "resend" exists (there's
   no separate email-sending mechanism outside inviteUserByEmail
   itself) — resetting and re-approving reuses the exact same path a
   first-time approval takes. */
export async function resetAccessRequest(id) {
  const client = requireSupabase();
  const { error } = await client
    .from("access_requests")
    .update({ status: "pending", decided_at: null })
    .eq("id", id);
  if (error) throw error;
}

export function accessRequestsToCsv(rows) {
  const cols = [
    "first_name", "last_name", "email", "company", "source", "source_other",
    "referred_by", "about", "marketing_consent", "status", "created_at", "decided_at",
  ];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.join(",")];
  rows.forEach((r) => lines.push(cols.map((c) => escape(r[c])).join(",")));
  return lines.join("\n");
}
