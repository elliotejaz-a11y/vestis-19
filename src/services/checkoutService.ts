import { supabase } from "@/integrations/supabase/client";

export interface StripeCheckoutSessionResponse {
  url: string;
}

export async function createCheckoutSession(): Promise<StripeCheckoutSessionResponse> {
  const { data, error } = await supabase.functions.invoke("vestis-create-checkout", {
    body: {},
  });

  if (error) throw new Error(error.message || "Could not start checkout. Please try again.");
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.url !== "string") throw new Error("No checkout URL received.");

  return { url: data.url };
}
