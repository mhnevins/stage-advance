/*
 * Decision logic for automatic access-request approval. Deliberately free
 * of Supabase/Netlify imports — everything it touches comes in through
 * `store` — so it can be unit tested with a fake (autoApprove.test.js).
 * netlify/functions/auto-approve.js supplies the real store.
 *
 * What it guards against (see the 2026-10-24 discussion): people typing
 * junk or other people's addresses to make us send invites, and runaway
 * volume hitting Supabase's 30 auth-emails/hour limit (which magic-link
 * sign-ins share) or Gmail's daily sending cap. Anything it won't approve
 * is simply left pending for Michael to approve by hand, with a Slack
 * note saying why — it never declines anyone.
 *
 * Every refusal path leaves the request pending. Any error fails closed.
 *
 * store shape:
 *   getSetting(key)               -> string | null          (throws on error)
 *   findRequest(email)            -> { id, status, created_at, first_name, last_name } | null
 *   countApproved({sinceMs, autoOnly}) -> number
 *   claim(id)                     -> boolean  (atomically pending -> approved; false if someone else got it)
 *   release(id)                   -> void     (approved -> pending again, used if the invite fails)
 *   invite(email)                 -> { error } (null error = sent, or already has an account)
 *   notify(text)                  -> void     (best-effort Slack)
 */

export const LIMITS = {
  perHour: 12,        // all approvals in the last hour — leaves headroom under Supabase's 30/hr auth-email limit for magic links
  perDay: 50,         // auto-approvals in the last 24h
  freshMs: 15 * 60 * 1000, // the request must have been submitted this recently
  minFillMs: 2000,    // a person can't fill in this form faster than this
};

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempr.email", "yopmail.com", "yopmail.net",
  "trashmail.com", "trashmail.net", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "throwawaymail.com", "fakeinbox.com", "mailnesia.com", "mintemail.com", "mohmal.com",
  "emailondeck.com", "spamgourmet.com", "moakt.com", "burnermail.io", "mytemp.email", "tmail.ws",
  "discard.email", "inboxkitten.com", "mail.tm", "1secmail.com", "1secmail.net", "1secmail.org",
]);

export function isDisposable(email) {
  const domain = String(email).toLowerCase().split("@").pop() || "";
  const parts = domain.split(".");
  // match the domain itself or any parent (so sub.mailinator.com is caught too)
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

const REASON_TEXT = {
  disposable: "disposable email address",
  too_fast: "form submitted unusually fast",
  hourly_cap: `hourly limit of ${LIMITS.perHour} reached`,
  daily_cap: `daily limit of ${LIMITS.perDay} reached`,
  invite_failed: "the invite email failed to send",
  error: "an internal error",
};

export async function decideAutoApproval({ email: rawEmail, elapsedMs, store, now = Date.now() }) {
  const email = String(rawEmail || "").trim().toLowerCase();
  const hold = async (reason, req, notify = true) => {
    if (notify && REASON_TEXT[reason]) {
      const who = req ? `${req.first_name} ${req.last_name} — ${email}` : email;
      await store.notify(`⏸ *Not auto-approved* (${REASON_TEXT[reason]}): ${who}\nStill pending — approve by hand on the Access requests screen if they look real.`);
    }
    return { approved: false, reason };
  };

  try {
    // Kill switch. Anything but exactly "on" (including a missing row) is off.
    if ((await store.getSetting("auto_approve")) !== "on") return { approved: false, reason: "off" };

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { approved: false, reason: "bad_email" };

    // The request must already exist, still be pending, and be brand new —
    // so this can only ever act on someone who just filled in the form,
    // never replay an old/reset row or invite an address nobody submitted.
    const req = await store.findRequest(email);
    if (!req) return { approved: false, reason: "no_request" };
    if (req.status !== "pending") return { approved: false, reason: "not_pending" };
    if (now - new Date(req.created_at).getTime() > LIMITS.freshMs) return { approved: false, reason: "stale" };

    if (isDisposable(email)) return hold("disposable", req);
    if (!(Number(elapsedMs) >= LIMITS.minFillMs)) return hold("too_fast", req);

    if ((await store.countApproved({ sinceMs: 60 * 60 * 1000, autoOnly: false })) >= LIMITS.perHour) return hold("hourly_cap", req);
    if ((await store.countApproved({ sinceMs: 24 * 60 * 60 * 1000, autoOnly: true })) >= LIMITS.perDay) return hold("daily_cap", req);

    // Claim first, invite second: the claim only succeeds for one caller,
    // so two simultaneous calls can never both send an invite.
    if (!(await store.claim(req.id))) return { approved: false, reason: "already_handled" };

    let inviteError = null;
    try {
      ({ error: inviteError } = await store.invite(email));
    } catch (e) {
      inviteError = e || new Error("invite failed");
    }
    if (inviteError) {
      try {
        await store.release(req.id);
      } catch {
        await store.notify(`⚠️ Invite to ${email} failed AND the request couldn't be put back to pending — it shows as approved. Use "Reset to pending" on the Access requests screen, then approve again.`);
        return { approved: false, reason: "invite_failed" };
      }
      return hold("invite_failed", req);
    }

    await store.notify(`✅ *Auto-approved* ${req.first_name} ${req.last_name} — ${email}. Invite sent.`);
    return { approved: true };
  } catch {
    try { await store.notify(`⚠️ Auto-approval hit an error for ${email} — left pending.`); } catch { /* best effort */ }
    return { approved: false, reason: "error" };
  }
}
