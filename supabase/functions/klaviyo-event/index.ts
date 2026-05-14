import { getApiKey, trackEvent } from "../_shared/klaviyo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Allowed event names — extend as Vestis grows
const ALLOWED_EVENTS = new Set([
  "Signed Up",
  "Signed In",
  "Item Added to Wardrobe",
  "Item Removed from Wardrobe",
  "Outfit Created",
  "Outfit Generated",
  "Outfit Shared",
  "Post Created",
  "Profile Updated",
  "Wishlist Item Added",
  "Password Reset",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = getApiKey();
    const body = await req.json().catch(() => ({}));

    const email = (body.email ?? "").trim().toLowerCase();
    const metric = (body.metric ?? "").trim();
    const properties = body.properties ?? {};
    const value = typeof body.value === "number" ? body.value : undefined;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!metric || !ALLOWED_EVENTS.has(metric)) {
      return new Response(
        JSON.stringify({ error: `Unknown event: "${metric}". Allowed: ${[...ALLOWED_EVENTS].join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await trackEvent(apiKey, { metric, email, properties, value });

    console.log("Klaviyo: tracked event", metric, "for", email);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("klaviyo-event error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
