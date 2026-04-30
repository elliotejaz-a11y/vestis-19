import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_preset: string | null;
  avatar_position: string;
  bio: string | null;
  is_public: boolean;
  style_preference: string | null;
  body_type: string | null;
  preferred_colors: string[] | null;
  fashion_goals: string | null;
  onboarding_completed: boolean;
  currency_preference: string;
  username_changed_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: any } | void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchingRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string, force = false) => {
    if (!force && profileFetchingRef.current === userId) return;
    profileFetchingRef.current = userId;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error) setProfile(data);
    profileFetchingRef.current = null;
  };

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on startup — no need for a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // setTimeout avoids Supabase internal deadlock on auth state reads
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: undefined },
    });

    // Fire-and-forget Klaviyo subscription on successful sign-up.
    // Never block or fail the signup flow if Klaviyo errors out.
    if (!error) {
      supabase.functions
        .invoke("klaviyo-subscribe", {
          body: { email, first_name: displayName },
        })
        .catch((e) => console.warn("Klaviyo subscribe failed (non-blocking):", e));
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem("pending_username");
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(data).eq("id", user.id);
    if (error) { console.error("updateProfile failed:", error); return { error }; }
    await fetchProfile(user.id, true);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, true);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
