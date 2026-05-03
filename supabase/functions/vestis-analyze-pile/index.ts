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

    const promptText = isOutfit
      ? "Analyze this outfit photo. Call detect_clothing_items with every garment and accessory worn — hats, tops, jumpers, outerwear, bottoms, dresses, shoes, bags, belts, watches, jewellery. Up to 8 items. Bounding boxes must be normalised 0–1. Never return a logo or graphic — always the complete garment it is printed on."
      : "Analyze this wardrobe image (pile, rail, shelf, or mix). Call detect_clothing_items with every distinct garment and accessory visible. Up to 8 items. Bounding boxes must be normalised 0–1. Never return a logo or graphic — always the complete garment.";

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            {
              name: "detect_clothing_items",
              description: "Detect all distinct clothing and accessory items visible in the image",
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
                        category: {
                          type: "string",
                          enum: ["hats", "tops", "bottoms", "dresses", "jumpers", "outerwear", "shoes", "accessories"],
                        },
                        color: { type: "string" },
                        fabric: {
                          type: "string",
                          enum: ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"],
                        },
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
        functionCallingConfig: { mode: "ANY" },
      },
      generationConfig: { temperature: 0.1 },
    };

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded after retries. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error ${response.status}: ${text.substring(0, 300)}`);
    }

    const payload = await response.json();
    console.log("Gemini finish_reason:", payload.candidates?.[0]?.finishReason);

    const part = payload.candidates?.[0]?.content?.parts?.[0];
    if (!part?.functionCall) {
      console.error("No functionCall in response:", JSON.stringify(payload).substring(0, 600));
      throw new Error("No structured AI response received");
    }

    const result = part.functionCall.args;
    console.log(`detect_clothing_items: found ${result.items?.length ?? 0} items`);

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
