// Klaviyo signup sync — creates a profile and subscribes them to the list.
// Triggered after a new user successfully verifies their email.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KLAVIYO_LIST_ID = "V26uMy";
const KLAVIYO_REVISION = "2024-02-15";

interface SyncRequest {
  email: string;
  firstName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("KLAVIYO_API_KEY");
    if (!apiKey) {
      console.error("KLAVIYO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as SyncRequest;
    const email = (body.email || "").trim().toLowerCase();
    const firstName = (body.firstName || "").trim();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const klaviyoHeaders = {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      revision: KLAVIYO_REVISION,
      accept: "application/json",
    };

    // Step 1: Create profile
    let profileId: string | null = null;

    const createProfileRes = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: klaviyoHeaders,
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

    if (createProfileRes.ok) {
      const created = await createProfileRes.json();
      profileId = created?.data?.id ?? null;
      console.log("Created Klaviyo profile", { email, profileId });
    } else if (createProfileRes.status === 409) {
      // Profile already exists — extract the id from the duplicate error response
      const conflict = await createProfileRes.json();
      profileId =
        conflict?.errors?.[0]?.meta?.duplicate_profile_id ??
        conflict?.errors?.[0]?.meta?.duplicate_profile?.id ??
        null;
      console.log("Klaviyo profile already exists, using existing id", { email, profileId });

      // Fallback: look it up by email if not present in the conflict payload
      if (!profileId) {
        const lookupUrl = `https://a.klaviyo.com/api/profiles/?filter=${encodeURIComponent(`equals(email,"${email}")`)}`;
        const lookupRes = await fetch(lookupUrl, {
          method: "GET",
          headers: klaviyoHeaders,
        });
        if (lookupRes.ok) {
          const lookup = await lookupRes.json();
          profileId = lookup?.data?.[0]?.id ?? null;
        } else {
          console.error("Klaviyo profile lookup failed", lookupRes.status, await lookupRes.text());
        }
      }
    } else {
      const errText = await createProfileRes.text();
      console.error("Klaviyo profile create failed", createProfileRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to create Klaviyo profile", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "Could not resolve Klaviyo profile id" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Subscribe profile to list
    const subscribeRes = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
      {
        method: "POST",
        headers: klaviyoHeaders,
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              profiles: {
                data: [
                  {
                    type: "profile",
                    id: profileId,
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
                data: { type: "list", id: KLAVIYO_LIST_ID },
              },
            },
          },
        }),
      },
    );

    if (!subscribeRes.ok && subscribeRes.status !== 202) {
      const errText = await subscribeRes.text();
      console.error("Klaviyo subscribe failed", subscribeRes.status, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to subscribe to list",
          profileId,
          details: errText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Klaviyo subscription job queued", { email, profileId });

    return new Response(
      JSON.stringify({ success: true, profileId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("klaviyo-sync-signup error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
