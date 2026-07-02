import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// No JWT auth — this endpoint is called by Stripe, not by the user.
// Authenticity is established by verifying the HMAC-SHA256 Stripe signature
// on every request. Any request that fails verification is rejected with 400.

interface StripeCheckoutSession {
  object: string;
  payment_status: string;
  metadata: Record<string, string> | null;
  customer_email: string | null;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
}

interface ProfilePremiumRow {
  is_premium: boolean | null;
}

async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  // Stripe signature header format: t=timestamp,v1=hmac_hex[,v0=legacy_hex]
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq > 0) parts[part.substring(0, eq)] = part.substring(eq + 1);
  }

  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSig === expectedSig;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    const signatureHeader = req.headers.get("stripe-signature");
    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Read raw body before any parsing — signature is over the raw bytes
    const rawBody = await req.text();

    const isValid = await verifyStripeSignature(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("vestis-stripe-webhook: signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    let event: StripeWebhookEvent;
    try {
      event = JSON.parse(rawBody) as StripeWebhookEvent;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Ignore all event types except checkout.session.completed
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const session = event.data.object;
    const supabaseUserId = session.metadata?.supabase_user_id;

    if (!supabaseUserId) {
      console.error("vestis-stripe-webhook: missing supabase_user_id in metadata, event:", event.id);
      return new Response(JSON.stringify({ error: "Missing supabase_user_id in session metadata" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Service role key bypasses RLS — required to write is_premium
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency check — if the user is already premium, return 200 without writing
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", supabaseUserId)
      .single();

    if (fetchError) {
      console.error("vestis-stripe-webhook: profile fetch failed for user", supabaseUserId, fetchError);
      return new Response(JSON.stringify({ error: "Database read error" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const row = existing as ProfilePremiumRow | null;
    if (row?.is_premium === true) {
      console.log("vestis-stripe-webhook: user already premium, skipping write", supabaseUserId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, boolean> = { is_premium: true };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", supabaseUserId);

    if (updateError) {
      console.error("vestis-stripe-webhook: profile update failed for user", supabaseUserId, updateError);
      return new Response(JSON.stringify({ error: "Database write error" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    console.log("vestis-stripe-webhook: upgraded user to premium", supabaseUserId);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("vestis-stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
