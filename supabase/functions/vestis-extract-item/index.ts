import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompt(item: Record<string, unknown>): string {
  const name = String(item.name ?? "clothing item");
  const category = String(item.category ?? "").toLowerCase();
  const color = String(item.color ?? "");
  const fabric = String(item.fabric ?? "");

  let posing = "clean flatlay, fully spread out showing the front of the garment";
  if (category === "bottoms") posing = "flat lay with both legs straight and parallel, waistband at top";
  else if (category === "shoes") posing = "three-quarter front product view";
  else if (category === "hats") posing = "front-facing product view";
  else if (category === "accessories") posing = "centered product view";

  return `Re-render the garment shown in the input image as a clean flatlay studio product photograph. Keep the EXACT same garment — same shape, colour (${color}), fabric (${fabric}), pattern, prints, logos and details — do not invent or change anything. Place it on a pure clean white studio background. Pose: ${posing}. Item: ${name}. Soft even studio lighting, subtle natural shadow under the garment, sharp focus, high resolution e-commerce catalogue style. No person, no model, no mannequin, no hanger.`;
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

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

    const { item, croppedImageBase64 } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!croppedImageBase64 || typeof croppedImageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing croppedImageBase64" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = buildPrompt(item as Record<string, unknown>);

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: dataUrlToBase64(croppedImageBase64) } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    };

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini image gen error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded.", imageBase64: null }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Image generation error ${response.status}`, imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const parts: Array<Record<string, unknown>> = aiData.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart) {
      console.error("No image in Gemini response:", JSON.stringify(aiData).substring(0, 400));
      return new Response(JSON.stringify({ error: "No image returned", imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inlineData = imagePart.inlineData as { mimeType: string; data: string };
    return new Response(
      JSON.stringify({ imageBase64: inlineData.data, mimeType: inlineData.mimeType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-extract-item error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", imageBase64: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
