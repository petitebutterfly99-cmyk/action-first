import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { activityStore } from "@/features/activity-log";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const next = (data as Profile) ?? null;
    setProfile(next);
    activityStore.setCurrentUser(next?.full_name || null);
  };

  // Track whether we've ever observed an authenticated session so we can
  // distinguish "never logged in" from "session expired/revoked".
  const hadSessionRef = useRef(false);
  const expiredToastShownRef = useRef(false);

  useEffect(() => {
    // Set up listener FIRST, then check existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        hadSessionRef.current = true;
        expiredToastShownRef.current = false;
        // Defer Supabase calls to avoid deadlock inside the callback.
        setTimeout(() => {
          loadProfile(newSession.user.id);
          activityStore.hydrate().catch(() => {/* page-level retry handles it */});
        }, 0);
      } else {
        setProfile(null);
        activityStore.setCurrentUser(null);
        if (event === "SIGNED_OUT") {
          activityStore.clear();
          hadSessionRef.current = false;
        }
        // Session went null mid-app (token refresh failure or silent revoke).
        // ProtectedRoute renders a <Navigate to="/login"> the next render;
        // surface a one-shot toast so the user knows why.
        if (
          (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
          !newSession &&
          hadSessionRef.current &&
          !expiredToastShownRef.current
        ) {
          expiredToastShownRef.current = true;
          toast.error("Session expired. Please sign in again.");
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        hadSessionRef.current = true;
        loadProfile(existing.user.id);
        activityStore.hydrate().catch(() => {/* page-level retry handles it */});
      }
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear local state immediately so the UI can navigate away even when
    // offline. The network call to revoke the server-side session is
    // fire-and-forget with a "local" scope fallback so it never blocks.
    setSession(null);
    setUser(null);
    setProfile(null);
    activityStore.setCurrentUser(null);
    activityStore.clear();
    hadSessionRef.current = false;

    try {
      // `scope: "local"` only clears the local storage tokens — no network
      // round-trip required, so it succeeds while offline.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore — local state is already cleared above.
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

const FALLBACK_AUTH: AuthContextValue = {
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Can occur briefly during HMR before the provider tree remounts.
    // Return a safe loading-state default rather than crashing the subtree.
    if (import.meta.env.DEV) {
      console.warn("useAuth called outside AuthProvider — returning defaults (likely HMR)");
    }
    return FALLBACK_AUTH;
  }
  return ctx;
}
