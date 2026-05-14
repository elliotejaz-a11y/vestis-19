import { getApiKey, createOrUpdateProfile, trackEvent } from "../_shared/klaviyo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify webhook secret
    const webhookSecret = Deno.env.get("SUPABASE_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token !== webhookSecret) {
        console.error("Webhook: unauthorized request");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    if (!record) {
      return new Response(JSON.stringify({ skipped: "no record" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = getApiKey();

    // profiles INSERT — sync new user to Klaviyo
    if (table === "profiles" && type === "INSERT") {
      const email = record.email as string | undefined;
      const displayName = record.display_name as string | undefined;
      const username = record.username as string | undefined;
      const avatarUrl = record.avatar_url as string | undefined;

      if (!email) {
        console.log("Webhook: profiles INSERT — no email field, skipping");
        return new Response(JSON.stringify({ skipped: "no email" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profileId = await createOrUpdateProfile(apiKey, {
        email,
        first_name: displayName,
        username,
        avatar_url: avatarUrl,
        properties: { source: "vestis_signup" },
      });

      await trackEvent(apiKey, {
        metric: "Signed Up",
        email,
        properties: { username, platform: "vestis" },
      });

      console.log("Webhook: synced new profile to Klaviyo", email, profileId);
    }

    // profiles UPDATE — keep Klaviyo profile in sync
    if (table === "profiles" && type === "UPDATE") {
      const email = record.email as string | undefined;
      if (email) {
        await createOrUpdateProfile(apiKey, {
          email,
          first_name: record.display_name as string | undefined,
          username: record.username as string | undefined,
          avatar_url: record.avatar_url as string | undefined,
        });
        console.log("Webhook: updated Klaviyo profile for", email);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("klaviyo-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
