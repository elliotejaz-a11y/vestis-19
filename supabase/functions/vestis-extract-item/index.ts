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

/** Try Gemini native image generation models (returns inlineData). */
async function tryGeminiImageGen(prompt: string, apiKey: string): Promise<{ imageBase64: string; mimeType: string } | null> {
  const models = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );

    if (res.status === 404) {
      console.log(`Model ${model} not found, trying next...`);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      console.error(`Gemini model ${model} error ${res.status}:`, text.substring(0, 300));
      continue;
    }

    const data = await res.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: Record<string, unknown>) => p.inlineData,
    ) as { inlineData: { data: string; mimeType: string } } | undefined;

    if (imagePart?.inlineData?.data) {
      return { imageBase64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? "image/png" };
    }
    console.error(`No image part in ${model} response:`, JSON.stringify(data).substring(0, 300));
  }
  return null;
}

/** Try Imagen 3 via the predict endpoint. */
async function tryImagen(prompt: string, apiKey: string): Promise<{ imageBase64: string; mimeType: string } | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "dont_allow",
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Imagen error", res.status, text.substring(0, 300));
    return null;
  }

  const data = await res.json();
  const prediction = data.predictions?.[0];
  if (prediction?.bytesBase64Encoded) {
    return { imageBase64: prediction.bytesBase64Encoded, mimeType: prediction.mimeType ?? "image/png" };
  }
  console.error("No prediction in Imagen response:", JSON.stringify(data).substring(0, 300));
  return null;
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

    // Try Gemini native image generation first, then fall back to Imagen 3
    const result = (await tryGeminiImageGen(prompt, GEMINI_API_KEY)) ?? (await tryImagen(prompt, GEMINI_API_KEY));

    if (!result) {
      console.error("All image generation methods exhausted for prompt:", prompt.substring(0, 100));
      return new Response(JSON.stringify({ error: "Image generation failed", imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ imageBase64: result.imageBase64, mimeType: result.mimeType }),
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
