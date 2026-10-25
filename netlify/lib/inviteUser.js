/*
 * The one place that actually sends an invite, shared by the admin's
 * manual Approve (netlify/functions/invite-user.js) and automatic
 * approval (netlify/functions/auto-approve.js) so both handle stale
 * invites identically.
 *
 * Returns { error } — null on success (including "already has a working
 * account, nothing to send"). Throws only on unexpected failures; callers
 * wrap this in try/catch.
 */
export async function inviteOrRepair(admin, email, redirectTo) {
  const invite = async () => admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  let { error: inviteErr } = await invite();

  if (inviteErr && /already.*(registered|exists)/i.test(inviteErr.message || "")) {
    // The address already has an auth user — could be someone who
    // genuinely already has a working account (fine, nothing to do),
    // or a stale invite stuck from an earlier attempt that never got
    // completed (e.g. the localhost-redirect bug from 2026-09-28,
    // which left invited users behind who never actually reached the
    // app). Only the second case should actually block a fresh invite,
    // so look the user up and decide instead of guessing from the
    // error text alone.
    //
    // Checking for a `profiles` row, not last_sign_in_at: Supabase
    // sets last_sign_in_at the moment an invite link's OTP is verified
    // server-side — which happens BEFORE the browser follows
    // redirectTo. So someone who clicked a broken-redirect link gets
    // last_sign_in_at set even though they never actually reached the
    // app. ensureMyProfile() (src/lib/profile.js) only runs once
    // useAuth.js sees a real session inside the actual running app
    // (src/lib/useAuth.js), so a profiles row means the app genuinely
    // loaded for this user at least once.
    // listUsers() returns one page (no pagination handled) — fine at
    // this project's current user count, revisit if that changes.
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw inviteErr;
    const existing = usersPage?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    let hasProfile = false;
    if (existing) {
      const { data: profileRow } = await admin
        .from("profiles")
        .select("id")
        .eq("id", existing.id)
        .maybeSingle();
      hasProfile = Boolean(profileRow);
    }

    if (existing && !hasProfile) {
      const { error: deleteErr } = await admin.auth.admin.deleteUser(existing.id);
      if (deleteErr) throw inviteErr;
      ({ error: inviteErr } = await invite());
    } else if (existing) {
      inviteErr = null; // has an actual profiles row — genuinely uses the app, nothing to send
    }
  }
  return { error: inviteErr || null };
}
