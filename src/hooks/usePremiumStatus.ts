import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface ProfilePremiumRow {
  is_premium: boolean | null;
}

const premiumStatusKey = (userId: string) => ["premium_status", userId] as const;

async function fetchPremiumStatus(userId: string): Promise<boolean> {
  // is_premium is not in the generated types (src/integrations/ is immutable),
  // so the select string is cast to string and the result cast to a typed interface.
  const { data: rawData, error } = await supabase
    .from("profiles")
    .select("is_premium" as string)
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);

  const row = rawData as ProfilePremiumRow | null;
  return row?.is_premium ?? false;
}

export function usePremiumStatus(): PremiumStatus {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<boolean, Error>({
    queryKey: user ? premiumStatusKey(user.id) : (["premium_status", null] as const),
    queryFn: () => fetchPremiumStatus(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    // Override global refetchOnWindowFocus: false so premium status updates
    // immediately when the user returns from the Stripe checkout tab.
    refetchOnWindowFocus: true,
  });

  // visibilitychange covers returning from Stripe checkout in a PWA (which
  // doesn't trigger a focus event on the window when switching back).
  useEffect(() => {
    if (!user) return;
    const key = premiumStatusKey(user.id);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, queryClient]);

  return {
    isPremium: data ?? false,
    isLoading,
    error: error ?? null,
  };
}
