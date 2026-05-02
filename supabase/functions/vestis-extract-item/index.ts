import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompt(category: string): string {
  const base = "Create a professional fashion e-commerce product photograph of this exact garment. Preserve its exact colours, patterns, textures and design.";

  const pose =
    category === "bottoms"
      ? "Flat lay: both legs fully extended straight downward in parallel, waistband at top, completely unfolded."
      : category === "shoes"
      ? "Three-quarter front angle view, both shoes shown together as a pair."
      : category === "dresses"
      ? "Flat lay: dress fully spread out showing the complete front silhouette."
      : category === "accessories"
      ? "Clean centred product shot."
      : "Flat lay: garment fully spread out, collar at top, no creases.";

  return `${base} ${pose} Pure white background, high-resolution studio lighting, sharp detail, isolated item only — no person, no model, no hanger, no shadow.`;
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
    if (!item || typeof item !== "object" || !croppedImageBase64) {
      return new Response(JSON.stringify({ error: "Missing item or image" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const category = String(item.category ?? "").toLowerCase();
    const prompt = buildPrompt(category);

    // Models that support image-in → image-out, tried in order
    const models = [
      "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-exp",
    ];

    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: croppedImageBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        },
      );

      if (res.status === 404) {
        console.log(`Model ${model} not found, trying next...`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        console.error(`Model ${model} error ${res.status}:`, body.substring(0, 400));
        continue;
      }

      const data = await res.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (p: Record<string, unknown>) => p.inlineData,
      ) as { inlineData: { data: string; mimeType: string } } | undefined;

      if (imagePart?.inlineData?.data) {
        return new Response(
          JSON.stringify({ imageBase64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? "image/jpeg" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.error(`No image part from ${model}:`, JSON.stringify(data).substring(0, 400));
    }

    // All models exhausted
    return new Response(
      JSON.stringify({ error: "Image generation failed", imageBase64: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-extract-item error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", imageBase64: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
