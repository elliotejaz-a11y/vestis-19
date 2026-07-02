import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StripeSessionApiResponse {
  url: string;
  id: string;
}

interface StripeApiError {
  error: {
    message: string;
    type: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorised" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorised" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");

    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!STRIPE_PRICE_ID) throw new Error("STRIPE_PRICE_ID is not configured");

    const { id: userId, email } = userData.user;

    const params = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price]": STRIPE_PRICE_ID,
      "line_items[0][quantity]": "1",
      "success_url": "https://vestisapp.com/premium/success?session_id={CHECKOUT_SESSION_ID}",
      "cancel_url": "https://vestisapp.com/premium/cancel",
      "metadata[supabase_user_id]": userId,
    });

    if (email) params.set("customer_email", email);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const rawErrText = await stripeRes.text();
      console.error("vestis-create-checkout: Stripe error", stripeRes.status, rawErrText);
      let stripeMessage = "Could not create checkout session. Please try again.";
      try {
        const errData: StripeApiError = JSON.parse(rawErrText);
        if (errData?.error?.message) stripeMessage = errData.error.message;
      } catch { /* keep default */ }
      // Return 200 with error in body — the Supabase client discards the body on
      // non-2xx responses, so checkoutService.ts would never see our message.
      // All other edge functions in this codebase use this same pattern.
      return new Response(
        JSON.stringify({ error: stripeMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const session: StripeSessionApiResponse = await stripeRes.json();

    console.log(`vestis-create-checkout: session created for user ${userId}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-create-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
