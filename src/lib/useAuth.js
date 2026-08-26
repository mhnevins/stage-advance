import { useCallback, useEffect, useState } from "react";
import { requireSupabase } from "./supabaseClient";
import { ensureMyProfile } from "./profile";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    let active = true;

    const applySession = async (session) => {
      const nextUser = session?.user || null;
      if (!active) return;
      setUser(nextUser);
      if (nextUser) {
        try {
          const p = await ensureMyProfile(nextUser);
          if (active) setProfile(p);
        } catch (e) {
          console.error("profile setup failed", e);
        }
      } else {
        setProfile(null);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    const supabase = requireSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await requireSupabase().auth.signOut();
  }, []);

  return { user, profile, loading, signInWithEmail, signOut };
}
