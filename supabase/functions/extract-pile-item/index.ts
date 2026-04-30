import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sourceImageBase64, item } = await req.json();

    if (!sourceImageBase64 || typeof sourceImageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing source image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const category = (item.category ?? "").toLowerCase();
    const isBottomWear = category === "bottoms";
    const isShoes = category === "shoes";

    const categoryRules = isBottomWear
      ? `

BOTTOM-WEAR RULES — MANDATORY, NO EXCEPTIONS:
✓ Show exactly ONE single pair of ${item.name} laid completely flat, front side up, on a pure white surface
✓ The garment must be fully spread out and unfolded, showing both legs in their natural shape
✓ Camera angle: straight-on or very slightly overhead — as used on ASOS product pages
✗ NEVER show two pairs, stacked items, or any form of duplication — ONE garment only
✗ NEVER fold, bunch, crumple, or roll the item — it must be completely flat
✗ NEVER show only one leg or a partial view — the full garment must be visible`
      : isShoes
      ? `

SHOES RULES — MANDATORY, NO EXCEPTIONS:
✓ Carefully examine the source image to identify: exact shoe silhouette, colourway, design details, logo/branding placement, sole style, and upper material/texture
✓ Generate a clean product photograph that matches those specific shoes — not a generic or stock shoe image
✓ Camera angle: three-quarter front view or clean side profile, matching standard shoe product photography
✓ The generated image must faithfully reproduce the actual shoe detected in the source photo
✗ Do NOT substitute a generic shoe — the output must reflect the specific model, colourway, and design seen in the source image`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Generate a professional e-commerce product photograph of a single clothing item.

Item: ${item.name}
Category: ${item.category}
Colour: ${item.color}
Fabric: ${item.fabric}

The output image MUST look exactly like a product listing on ASOS, Zara, or H&M — a clean flat product photo against a pure white background. Follow every rule below without exception:

✓ Pure solid white background — no texture, no shadow, no surface, no gradient
✓ Item is laid completely flat and spread out to its full natural shape, showing the front face
✓ Camera faces straight-on at the item — standard front-facing product photo angle
✓ Entire item is visible and centred in frame with a small white margin on all sides
✓ The item is fully unfolded — not rolled, not bunched, not crumpled

✗ NO person, body, hands, or skin visible anywhere
✗ NO model, mannequin, ghost mannequin, or display form of any kind
✗ NO hanger, hook, or any object holding the item
✗ NO other clothing items or accessories in the frame
✗ NO background from the source photo
${categoryRules}
Use the reference photo to identify the item's exact colour, fabric, design details, and any visible branding. Completely discard the source photo's background, people, and context. Generate a brand-new clean product photograph of just this single ${item.category}.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${sourceImageBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Image generation error ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const imageUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("data:image")) {
      throw new Error("No image preview returned");
    }

    const imageBase64 = imageUrl.split(",")[1];

    return new Response(JSON.stringify({ imageBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
