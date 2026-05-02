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
  const tags = Array.isArray(item.tags) ? (item.tags as string[]).slice(0, 5).join(", ") : "";
  const notes = String(item.notes ?? "");

  let prompt = `Professional fashion e-commerce product photograph of a ${color} ${name}`;
  if (fabric && fabric !== "Unknown") prompt += `, ${fabric} material`;
  if (tags) prompt += `, ${tags} style`;
  if (notes) prompt += `. ${notes}`;

  if (category === "bottoms") {
    prompt += `. Flat lay on pure white background, both legs fully extended straight downward in parallel, waistband at top, garment completely unfolded`;
  } else if (category === "shoes") {
    prompt += `. Three-quarter front angle view on pure white background, pair of shoes shown together`;
  } else if (category === "dresses") {
    prompt += `. Flat lay on pure white background, dress fully spread out showing complete front silhouette`;
  } else if (category === "accessories") {
    prompt += `. Clean product shot on pure white background, item centred and well-lit`;
  } else {
    prompt += `. Flat lay on pure white background, garment fully spread out showing complete front face, collar at top`;
  }

  prompt += `. Pure white background, high-resolution studio lighting, sharp detail, clean minimal fashion e-commerce photography, isolated item only, no person, no model, no hanger, no shadow`;
  return prompt;
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

    const { item } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = buildPrompt(item as Record<string, unknown>);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini image generation error:", response.status, text);
      return new Response(JSON.stringify({ error: `Image generation failed: ${response.status}`, imageBase64: null }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: Record<string, unknown>) => p.inlineData,
    ) as { inlineData: { data: string; mimeType: string } } | undefined;

    if (!imagePart?.inlineData?.data) {
      console.error("No image in Gemini response:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify({ error: "No image returned", imageBase64: null }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ imageBase64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-extract-item error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", imageBase64: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
