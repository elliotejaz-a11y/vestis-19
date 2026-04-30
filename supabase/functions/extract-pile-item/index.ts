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

BOTTOM-WEAR FLAT LAY — STRICT MANDATORY RULES, ZERO EXCEPTIONS:
✓ ONE single pair of ${item.name}, pressed completely flat like a garment laid on a table
✓ BOTH legs fully extended and pointing straight downward in parallel — waistband at top, leg openings at bottom
✓ The garment fully spread open showing the complete front face — no part hidden or folded under
✓ Camera shoots directly overhead or perfectly straight-on — zero perspective angle or distortion
✓ Think of how a pair of trousers looks when ironed flat and laid on a white surface — that is the exact result required
✗ NEVER fold any part of the garment — no folded hems, no folded waistband, no folded cuffs
✗ NEVER cross or angle the legs — both legs must be parallel and pointing straight down
✗ NEVER bunch, crumple, twist, or create any 3D depth in the fabric
✗ NEVER show two pairs or any duplication — exactly ONE garment`
      : isShoes
      ? `

SHOES — MANDATORY RULES:
✓ Carefully examine the source image for: exact shoe silhouette, colourway, design details, logo/branding placement, sole style, and upper material/texture
✓ Generate a clean product photograph that matches those specific shoes — not a generic or stock shoe image
✓ Camera angle: three-quarter front view or clean side profile, as used in professional shoe product photography
✓ The output must faithfully reproduce the actual shoe detected in the source photo
✗ Do NOT substitute a generic shoe — match the specific model, colourway, and design from the source image`
      : "";

    const prompt = `Generate a professional e-commerce product photograph of a single clothing item.

Item: ${item.name}
Category: ${item.category}
Colour: ${item.color}
Fabric: ${item.fabric}

The output image MUST look exactly like a product listing on ASOS, Zara, or H&M — a clean flat product photo against a pure white background. Follow every rule below without exception:

FULL GARMENT RULE — MANDATORY:
✓ Generate the COMPLETE, ENTIRE ${item.category} as a whole piece of clothing — every part visible from collar/waistband to hem
✓ If the source photo shows a graphic, logo, print, badge, or patch ON the garment — generate the FULL garment wearing that graphic, not the graphic alone
✗ NEVER generate just a logo, badge, patch, graphic, emblem, or design detail in isolation
✗ NEVER crop to a close-up detail — always show the complete garment

STANDARD PRODUCT RULES:
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
Use the reference photo to identify the item's exact colour, fabric, design details, and any visible branding. Completely discard the source photo's background, people, and context. Generate a brand-new clean product photograph of just this single ${item.category}.`;

    const generateImage = async (): Promise<string> => {
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
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${sourceImageBase64}` } },
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
      return imageUrl.split(",")[1];
    };

    // For bottoms, verify the flat-lay quality and retry once if it looks folded/wrong.
    const verifyBottomsFlatLay = async (imageBase64: string): Promise<boolean> => {
      try {
        const verifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Look at this product image. Answer with ONLY the word "yes" or "no", nothing else.
Is this image showing a single pair of pants/trousers/bottoms laid COMPLETELY FLAT with BOTH legs fully extended straight downward in parallel, with NO folding, NO crossing, NO bunching of any part of the garment?`,
                  },
                  { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
                ],
              },
            ],
          }),
        });
        if (!verifyResponse.ok) return true; // if verify call fails, accept the image
        const verifyPayload = await verifyResponse.json();
        const answer = (verifyPayload.choices?.[0]?.message?.content ?? "").toLowerCase().trim();
        return answer.startsWith("yes");
      } catch {
        return true; // on any error, accept the image
      }
    };

    let imageBase64 = await generateImage();

    if (isBottomWear) {
      const isValidFlatLay = await verifyBottomsFlatLay(imageBase64);
      if (!isValidFlatLay) {
        imageBase64 = await generateImage();
      }
    }

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
