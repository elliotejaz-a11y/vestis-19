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

Use the reference photo only to identify the item's colour, fabric, and design details. Completely discard the source photo's background, people, and context. Generate a brand-new clean product photograph of just this single ${item.category}.`,
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
