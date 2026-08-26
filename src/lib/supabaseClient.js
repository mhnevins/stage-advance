/*
 * Single shared Supabase client. Everything that talks to Supabase
 * (auth, storage, inventory, profile, submissions) imports from here so
 * there's only ever one GoTrueClient instance in the page.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "Supabase needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (see README)."
    );
  }
  return supabase;
};
