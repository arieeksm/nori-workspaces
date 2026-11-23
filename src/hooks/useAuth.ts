import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  username: string | null;
  full_name: string | null;
}

export interface UseAuth {
  session: Session | null;
  profile: UserProfile | null;
  /** True until the stored session (if any) has been read. */
  loading: boolean;
  /** Resolves to null on success, or a user-facing error message. */
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Restore a session saved by a previous visit.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Keep the UI in sync with authentication changes across tabs and token refreshes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user.id;

    if (!userId) {
      setProfile(null);
      return () => {
        active = false;
      };
    }

    // Fetch separately from the auth-state callback to avoid holding the auth lock.
    void supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setProfile(null);
          return;
        }
        setProfile({
          username: data.username,
          full_name: data.full_name,
        });
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (identifier: string, password: string): Promise<string | null> => {
    const normalizedIdentifier = identifier.trim();
    let email = normalizedIdentifier;

    if (!normalizedIdentifier.includes("@")) {
      const { data, error } = await supabase.rpc("get_email_by_username", {
        p_username: normalizedIdentifier,
      });

      if (error || typeof data !== "string" || data.trim() === "") {
        return "Invalid login credentials";
      }

      email = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;

    if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
    if (error.status === 400 || error.status === 401) return "Invalid login credentials";
    return error.message || "Could not sign in. Please try again.";
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // If the server could not be reached, still clear the session on this device.
    if (error) await supabase.auth.signOut({ scope: "local" });
  }, []);

  return { session, profile, loading, signIn, signOut };
}
