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

    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (imageBase64.length * 0.75 > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Image too large (max 10MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Analyze this clothing item photo. Call classify_clothing with the garment's name, category, color, fabric, style tags, and estimated retail price in NZD.",
            },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            {
              name: "classify_clothing",
              description: "Classify a single clothing item from a photo and estimate its retail value",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: 'e.g. "Navy Linen Blazer"' },
                  category: {
                    type: "string",
                    enum: ["hats", "tops", "bottoms", "dresses", "jumpers", "outerwear", "shoes", "accessories"],
                    description: "hats=all headwear, jumpers=knitwear/sweaters, accessories=bags/belts/jewellery/watches",
                  },
                  color: { type: "string" },
                  fabric: {
                    type: "string",
                    enum: ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"],
                  },
                  style_tags: { type: "array", items: { type: "string" } },
                  estimated_price_nzd: { type: "number" },
                },
                required: ["name", "category", "color", "fabric", "style_tags", "estimated_price_nzd"],
              },
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: { mode: "ANY" },
      },
    };

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded after retries. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error ${response.status}: ${text.substring(0, 400)}`);
    }

    const aiData = await response.json();
    const candidate = aiData.candidates?.[0];
    console.log("finishReason:", candidate?.finishReason, "parts:", candidate?.content?.parts?.length);

    const parts: Array<Record<string, unknown>> = candidate?.content?.parts ?? [];
    const fnPart = parts.find((p) => p.functionCall);
    if (!fnPart) {
      console.error("Full Gemini response:", JSON.stringify(aiData));
      throw new Error(`No functionCall in Gemini response. finishReason: ${candidate?.finishReason}`);
    }

    const result = (fnPart.functionCall as { args: unknown }).args;
    console.log("classify_clothing:", (result as { name?: string; category?: string }).name, (result as { name?: string; category?: string }).category);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("vestis-analyze-item error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
