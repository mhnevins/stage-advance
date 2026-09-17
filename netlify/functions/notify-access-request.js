/*
 * Thin relay: formats a new access request as a Slack message and posts
 * it to a Slack Incoming Webhook. Kept server-side so the webhook URL
 * never ships in the client bundle. Best-effort only — the client that
 * calls this never surfaces its failures to the person requesting access;
 * the access_requests row (written directly via Supabase before this
 * fires) is the actual source of truth, this is just the alert.
 *
 * Requires SLACK_WEBHOOK_URL as a Netlify environment variable.
 */

const SOURCE_LABELS = {
  google: "Google search", facebook: "Facebook", instagram: "Instagram",
  referral: "Referred by a friend/colleague", reddit: "Reddit", youtube: "YouTube",
  ai: "AI assistant", other: "Other",
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "Not configured." }), { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { firstName, lastName, email, company, source, sourceOther, referredBy } = body || {};
  const sourceText = source === "other" && sourceOther ? `Other — ${sourceOther}`
    : source === "referral" && referredBy ? `Referred by ${referredBy}`
    : SOURCE_LABELS[source] || source || "unknown";

  const lines = [
    `*New StageAdvance access request*`,
    `${[firstName, lastName].filter(Boolean).join(" ")} — ${email}`,
    company ? `Company: ${company}` : null,
    `Heard about us via: ${sourceText}`,
  ].filter(Boolean);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch {
    // swallow — this is a best-effort notification
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};
