/*
 * Band Form questionnaire submissions, backed by the `submissions`
 * table (real columns, not a KV blob — needed for per-row RLS: anyone
 * can INSERT, only the owning engineer can SELECT/DELETE). Maps
 * DB snake_case columns to the camelCase shape App.jsx already expects
 * from blankForm()/submissionToShow().
 */

import { requireSupabase } from "./supabaseClient";

const fromRow = (r) => ({
  id: r.id,
  band: r.band || "",
  contactName: r.contact_name || "",
  email: r.email || "",
  phone: r.phone || "",
  members: r.members || [],
  backlineBring: r.backline_bring || "",
  backlineNeed: r.backline_need || "",
  tracks: !!r.tracks,
  click: !!r.click,
  unusual: r.unusual || "",
  anythingElse: r.anything_else || "",
  submittedAt: r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "",
});

export async function listMine() {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("owner_id", user.id)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function removeMine(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("submissions").delete().eq("id", id);
  if (error) throw error;
}

export async function submitPublic(ownerId, form) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("submissions").insert({
    owner_id: ownerId,
    band: form.band,
    contact_name: form.contactName,
    email: form.email,
    phone: form.phone,
    members: form.members,
    backline_bring: form.backlineBring,
    backline_need: form.backlineNeed,
    tracks: form.tracks,
    click: form.click,
    unusual: form.unusual,
    anything_else: form.anythingElse,
  });
  if (error) throw error;
}
