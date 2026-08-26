/*
 * Each engineer gets a `profiles` row: id (= auth user id), a unique
 * URL-safe slug used in their Band Form link (/form/{slug}), and a
 * display name. `profiles` is the one table that's publicly readable
 * (see supabase/migrations/0001_multi_tenant.sql) so the standalone
 * Band Form can resolve a slug to an owner before any login exists.
 */

import { supabase, requireSupabase } from "./supabaseClient";

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

// profiles.slug has a `{3,40}` length check in the DB — pad short bases
// (e.g. an email like "me@...") with a random suffix so it always passes.
const slugify = (s) => {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  return cleaned.length >= 3 ? cleaned : `${cleaned || "engineer"}-${randomSuffix()}`;
};

export async function ensureMyProfile(user) {
  if (!user) return null;
  const client = requireSupabase();

  const { data: existing, error: selErr } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const base = slugify(user.email?.split("@")[0] || "engineer");
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const { data, error } = await client
      .from("profiles")
      .insert({ id: user.id, slug, display_name: user.email })
      .select()
      .maybeSingle();
    if (!error) return data;
    if (error.code !== "23505") throw error; // not a unique-violation — a real error
  }
  throw new Error("Could not allocate a unique Band Form link after several attempts.");
}

export async function resolveOwnerBySlug(slug) {
  if (!slug || !supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, slug, display_name")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}
