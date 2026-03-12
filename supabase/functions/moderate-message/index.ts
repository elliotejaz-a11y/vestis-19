import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://vestis-19.lovable.app",
  "https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app",
  "https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const senderId = claimsData.claims.sub;

    const { receiverId, content } = await req.json();

    if (!receiverId || !content?.trim()) {
      return new Response(JSON.stringify({ error: "Missing receiverId or content" }), { status: 400, headers: corsHeaders });
    }

    const trimmedContent = content.trim();

    // Skip length check and AI moderation for image messages (fit pics)
    const isImageMessage = trimmedContent.startsWith("[IMG]") && trimmedContent.endsWith("[/IMG]");

    if (!isImageMessage && trimmedContent.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long (max 2000 characters)" }), { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let isFlagged = false;
    let flagReason: string | null = null;

    if (LOVABLE_API_KEY && !isImageMessage) {
      try {
        const moderationResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are a content moderator. Analyze the message and determine if it violates any of these rules:
1. Sexual/nude content or solicitation
2. Harassment, bullying, or threats
3. Hate speech or discrimination
4. Spam or scam content
5. Sharing of personal information (phone numbers, addresses)
6. Drug-related content

Respond with ONLY a JSON object: {"flagged": true/false, "reason": "brief reason or null"}
No other text.`,
              },
              { role: "user", content: trimmedContent },
            ],
          }),
        });

        if (moderationResp.ok) {
          const moderationData = await moderationResp.json();
          const aiContent = moderationData.choices?.[0]?.message?.content || "";
          try {
            const cleaned = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const result = JSON.parse(cleaned);
            isFlagged = result.flagged === true;
            flagReason = result.reason || null;
          } catch {
            console.error("Failed to parse moderation response:", aiContent);
          }
        }
      } catch (e) {
        console.error("Moderation check failed:", e);
      }
    }

    if (isFlagged) {
      return new Response(
        JSON.stringify({ error: "Message blocked", reason: flagReason || "Content violates community guidelines" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: trimmedContent,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      if (insertError.message?.includes("row-level security")) {
        return new Response(
          JSON.stringify({ error: "You can only message friends" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to send message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
