import { getApiKey, createOrUpdateProfile, subscribeToList } from "../_shared/klaviyo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIST_ID = "V26uMy";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = getApiKey();
    const body = await req.json().catch(() => ({}));
    const email = (body.email ?? "").trim().toLowerCase();
    const firstName = (body.first_name ?? "").trim();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileId = await createOrUpdateProfile(apiKey, { email, first_name: firstName });
    await subscribeToList(apiKey, LIST_ID, email, profileId);

    console.log("Klaviyo: subscribed", email, "profile:", profileId);
    return new Response(JSON.stringify({ success: true, profile_id: profileId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("klaviyo-subscribe error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
