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

    const { imageBase64, mode } = await req.json();
    const isOutfit = mode === "outfit";
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: isOutfit
              ? "You identify every distinct clothing item, footwear and accessory worn by a person in an outfit photo. Scan the full body: hats, tops, jumpers/outerwear, bottoms, dresses, shoes, watches, jewellery, bags, belts and other accessories. Return each visible item separately. Keep bounding boxes approximate, normalised from 0 to 1. CRITICAL: Always identify the COMPLETE garment, never a graphic, logo, patch, or print that appears ON the garment. If you see a tiger print on a shirt, detect the shirt — not the tiger. If you see a logo on a cap, detect the cap — not the logo."
              : "You identify distinct wardrobe items from a single photo that may contain a pile of clothes, rails, shelves, shoes, hats, and accessories. Return only clearly visible items worth reviewing individually. Keep bounding boxes approximate, normalised from 0 to 1. CRITICAL: Always identify the COMPLETE garment, never a graphic, logo, patch, or print that appears ON the garment. If you see a graphic on a hoodie, detect the hoodie — not the graphic. Logos, badges, and patches are not wardrobe items.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: isOutfit
                  ? "Analyse this outfit photo and return up to 8 distinct worn items (clothing, shoes, accessories like watches/bags/belts/jewellery). Skip the person and background. Each item must be a complete garment or accessory — never a logo, graphic, patch, embroidery, or design element found ON a garment. For each item provide: id, name, category, color, fabric, tags, notes, estimated_price_nzd, confidence, crop_hint, and bbox with x,y,width,height normalised between 0 and 1."
                  : "Analyse this wardrobe pile image and return up to 8 distinct items. Each item must be a complete garment or accessory — never a logo, graphic, patch, embroidery, or design element found ON a garment. If an item appears to be only a graphic or logo, identify the actual garment it belongs to instead. For each item provide: id, name, category, color, fabric, tags, notes, estimated_price_nzd, confidence, crop_hint, and bbox with x,y,width,height normalised between 0 and 1.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_clothing_items",
              description: "Detect distinct clothing and accessory items in one image",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        category: { type: "string", enum: ["hats", "tops", "bottoms", "dresses", "jumpers", "outerwear", "shoes", "accessories"] },
                        color: { type: "string" },
                        fabric: { type: "string", enum: ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"] },
                        tags: { type: "array", items: { type: "string" } },
                        notes: { type: "string" },
                        estimated_price_nzd: { type: "number" },
                        confidence: { type: "number" },
                        crop_hint: { type: "string" },
                        bbox: {
                          type: "object",
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                            width: { type: "number" },
                            height: { type: "number" },
                          },
                          required: ["x", "y", "width", "height"],
                          additionalProperties: false,
                        },
                      },
                      required: ["id", "name", "category", "color", "fabric", "tags", "notes", "estimated_price_nzd", "confidence", "crop_hint", "bbox"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "detect_clothing_items" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured AI response received");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
