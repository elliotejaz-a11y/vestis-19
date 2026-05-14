import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type VestisEvent =
  | "Signed Up"
  | "Signed In"
  | "Item Added to Wardrobe"
  | "Item Removed from Wardrobe"
  | "Outfit Created"
  | "Outfit Generated"
  | "Outfit Shared"
  | "Post Created"
  | "Profile Updated"
  | "Wishlist Item Added"
  | "Password Reset";

export function useKlaviyo() {
  const { user, profile } = useAuth();

  const subscribe = useCallback(
    async (email: string, firstName?: string) => {
      try {
        await supabase.functions.invoke("klaviyo-subscribe", {
          body: { email, first_name: firstName ?? "" },
        });
      } catch (e) {
        console.warn("Klaviyo subscribe failed (non-blocking):", e);
      }
    },
    [],
  );

  const track = useCallback(
    async (metric: VestisEvent, properties?: Record<string, unknown>) => {
      const email = user?.email ?? profile?.email;
      if (!email) return;
      try {
        await supabase.functions.invoke("klaviyo-event", {
          body: { email, metric, properties: properties ?? {} },
        });
      } catch (e) {
        console.warn("Klaviyo track failed (non-blocking):", e);
      }
    },
    [user, profile],
  );

  return { subscribe, track };
}
