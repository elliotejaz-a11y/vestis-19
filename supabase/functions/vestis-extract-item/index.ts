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

  let posing = "front-facing flatlay, fully spread out showing the entire front of the garment";
  if (category === "bottoms") posing = "front-facing flatlay with both legs straight and parallel, waistband at top";
  else if (category === "shoes") posing = "single pair of shoes, centered, three-quarter front product view";
  else if (category === "hats") posing = "single hat, centered, front-facing product view";
  else if (category === "accessories") posing = "single accessory, centered product view";

  return `Re-render THIS exact garment from the supplied photo as a clean e-commerce catalogue product image. Preserve the real colour, pattern, fabric texture, cut, and proportions of the actual item — do NOT invent a new garment.

Reference details (for disambiguation only — the photo is the source of truth):
- Name: ${name}
- Category: ${category}
- Colour: ${color}
- Fabric: ${fabric}

Output requirements:
- Pose: ${posing}
- Pure white seamless studio background
- Soft even studio lighting, sharp focus, subtle natural drop shadow
- Item centred, large in frame, filling ~80% of the image height
- No body parts, model, mannequin, hanger, other garments, floor, bed, text, labels, or watermarks
- Remove any folds, creases or occlusion caused by being in a pile — present the garment cleanly as if styled for a product listing`;
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

    const { item, sourceImageBase64 } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = buildPrompt(item as Record<string, unknown>);

    // Image-to-image edit via Gemini Nano Banana 2 — preserves the actual garment
    // from the user's photo instead of hallucinating a new one.
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (sourceImageBase64 && typeof sourceImageBase64 === "string") {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${sourceImageBase64}` },
      });
    }

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: userContent }],
          modalities: ["image", "text"],
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway image gen error:", response.status, text);
      let message = `Image generation error ${response.status}`;
      try {
        const payload = JSON.parse(text);
        message = payload?.error?.message || message;
      } catch { /* keep generic */ }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly.", imageBase64: null }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits.", imageBase64: null }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: message, imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    // Gateway normalises Gemini image output into the OpenAI images shape under `data[].b64_json`.
    // Fall back to scanning choices[].message.images[] for raw OpenRouter passthrough.
    let imageB64: string | null = result?.data?.[0]?.b64_json ?? null;
    if (!imageB64) {
      const msg = result?.choices?.[0]?.message;
      const imgs = msg?.images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        const url = imgs[0]?.image_url?.url ?? imgs[0]?.url ?? "";
        if (typeof url === "string" && url.startsWith("data:")) {
          imageB64 = url.split(",")[1] ?? null;
        }
      }
    }

    if (!imageB64) {
      console.error("No image in AI response:", JSON.stringify(result).substring(0, 400));
      return new Response(JSON.stringify({ error: "No image returned", imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ imageBase64: imageB64, mimeType: "image/png" }),
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
