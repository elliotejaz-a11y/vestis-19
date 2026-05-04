import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 && i < maxRetries - 1) {
      const waitMs = Math.pow(2, i) * 2000;
      console.log(`Rate limited. Waiting ${waitMs}ms before retry ${i + 1}...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mode } = await req.json();
    const isOutfit = mode === "outfit";
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = isOutfit
      ? "You identify every distinct clothing item, footwear and accessory worn by a person in an outfit photo. Scan the full body: hats, tops, jumpers/outerwear, bottoms, dresses, shoes, watches, jewellery, bags, belts and other accessories. Return each visible item separately. Bounding boxes normalised 0–1. CRITICAL: Always identify the COMPLETE garment, never a graphic, logo, patch, or print that appears ON the garment."
      : "You identify distinct wardrobe items from a single photo that may contain a pile of clothes, rails, shelves, shoes, hats, and accessories. Bounding boxes normalised 0–1. CRITICAL: Always identify the COMPLETE garment, never a graphic, logo, patch, or print that appears ON the garment.";

    const userPrompt = isOutfit
      ? "Analyse this outfit photo and return up to 8 distinct worn items. For each item provide: id, name, category, color, fabric, tags, notes, estimated_price_nzd, confidence, crop_hint, and bbox with x,y,width,height normalised between 0 and 1."
      : "Analyse this wardrobe pile image and return up to 8 distinct items. For each item provide: id, name, category, color, fabric, tags, notes, estimated_price_nzd, confidence, crop_hint, and bbox with x,y,width,height normalised between 0 and 1.";

    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            {
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
                        },
                      },
                      required: ["id", "name", "category", "color", "fabric", "tags", "notes", "estimated_price_nzd", "confidence", "crop_hint", "bbox"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["detect_clothing_items"] },
      },
    };

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini HTTP error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error ${response.status}: ${text.substring(0, 400)}`);
    }

    const aiData = await response.json();
    const candidate = aiData.candidates?.[0];
    const parts: Array<Record<string, unknown>> = candidate?.content?.parts ?? [];
    const fnPart = parts.find((p) => p.functionCall);
    if (!fnPart) {
      console.error("Full Gemini response:", JSON.stringify(aiData).substring(0, 500));
      throw new Error(`No functionCall in Gemini response. finishReason: ${candidate?.finishReason}`);
    }

    const result = (fnPart.functionCall as { args: unknown }).args;
    console.log(`detect_clothing_items: found ${(result as { items?: unknown[] }).items?.length ?? 0} items`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("vestis-analyze-pile error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
