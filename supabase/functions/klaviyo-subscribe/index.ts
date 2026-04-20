// Klaviyo signup subscription edge function
// Creates a Klaviyo profile and subscribes them to list V26uMy with SUBSCRIBED consent.
// Called from the client immediately after a successful sign-up.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-02-15";
const LIST_ID = "V26uMy";

interface SubscribePayload {
  email?: string;
  first_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("KLAVIYO_API_KEY");
    if (!apiKey) {
      console.error("KLAVIYO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Klaviyo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: SubscribePayload = {};
    try {
      body = await req.json();
    } catch (_) {
      // empty body
    }

    const email = (body.email || "").trim().toLowerCase();
    const firstName = (body.first_name || "").trim();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = {
      "Authorization": `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "revision": KLAVIYO_REVISION,
    };

    // 1. Create profile
    const profileRes = await fetch(`${KLAVIYO_BASE}/profiles/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            ...(firstName ? { first_name: firstName } : {}),
          },
        },
      }),
    });

    let profileId: string | null = null;

    if (profileRes.ok) {
      const profileJson = await profileRes.json();
      profileId = profileJson?.data?.id ?? null;
      console.log("Klaviyo profile created:", profileId);
    } else if (profileRes.status === 409) {
      // Profile exists — extract existing id from the duplicate-error meta
      const errJson = await profileRes.json().catch(() => null);
      profileId =
        errJson?.errors?.[0]?.meta?.duplicate_profile_id ?? null;
      console.log("Klaviyo profile already exists, reusing:", profileId);
    } else {
      const text = await profileRes.text();
      console.error(
        `Klaviyo profile create failed [${profileRes.status}]: ${text}`,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to create Klaviyo profile",
          status: profileRes.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Subscribe profile to list V26uMy with SUBSCRIBED consent
    const subRes = await fetch(
      `${KLAVIYO_BASE}/profile-subscription-bulk-create-jobs/`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              profiles: {
                data: [
                  {
                    type: "profile",
                    ...(profileId ? { id: profileId } : {}),
                    attributes: {
                      email,
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: "SUBSCRIBED",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            relationships: {
              list: {
                data: { type: "list", id: LIST_ID },
              },
            },
          },
        }),
      },
    );

    if (!subRes.ok) {
      const text = await subRes.text();
      console.error(
        `Klaviyo subscription failed [${subRes.status}]: ${text}`,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to subscribe profile",
          status: subRes.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Klaviyo subscription job accepted for", email);

    return new Response(
      JSON.stringify({ success: true, profile_id: profileId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("klaviyo-subscribe error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
