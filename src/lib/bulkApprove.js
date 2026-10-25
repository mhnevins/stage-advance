/*
 * Picks which pending access requests the admin's "Approve all pending"
 * button should approve in one go. Pure (no Supabase) so it can be unit
 * tested — see bulkApprove.test.js.
 *
 *  - Oldest first, so whoever has waited longest gets in first.
 *  - Disposable-email addresses are skipped (same list the automatic
 *    approval refuses), left pending for the admin to judge by hand.
 *  - At most `max` per click. Each approval sends an invite email, and
 *    Supabase caps auth emails at 30/hour (sign-in links share that
 *    budget), so a big backlog is worked through in batches rather than
 *    all at once.
 */

import { isDisposable } from "../../netlify/lib/autoApprove.js";

export const BULK_APPROVE_MAX = 20;

export function planBulkApproval(pendingRows, { max = BULK_APPROVE_MAX } = {}) {
  // The admin screen lists newest first; work from the oldest.
  const oldestFirst = [...pendingRows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const eligible = oldestFirst.filter((r) => !isDisposable(r.email));
  return {
    batch: eligible.slice(0, max),
    skippedDisposable: oldestFirst.length - eligible.length,
    remaining: Math.max(0, eligible.length - max),
  };
}
