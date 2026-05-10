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
  const notes = String(item.notes ?? "");
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";

  let posing = "front-facing flatlay, fully spread out showing the entire front of the garment";
  if (category === "bottoms") posing = "front-facing flatlay with both legs straight and parallel, waistband at top";
  else if (category === "shoes") posing = "single pair of shoes, centered, three-quarter front product view";
  else if (category === "hats") posing = "single hat, centered, front-facing product view";
  else if (category === "accessories") posing = "single accessory, centered product view";

  return `Create a brand-new clean e-commerce catalogue product image of one clothing item.

Item name: ${name}
Category: ${category}
Colour: ${color}
Fabric/material: ${fabric}
Detected details: ${notes || "none"}
Style tags: ${tags || "none"}

Render a plausible single item matching those details as a polished studio flatlay. The item must be isolated, centered, large in frame, and fill about 80 percent of the image height. Pose: ${posing}. Use a pure white studio background, soft even studio lighting, sharp focus, clean product-photography realism, and a subtle natural shadow. Do not include any clothing piles, multiple unrelated garments, body parts, floor, bed, model, mannequin, hanger, text, labels, watermarks, or background clutter.`;
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

    const { item } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const prompt = buildPrompt(item as Record<string, unknown>);

    const response = await fetchWithRetry(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          quality: "medium",
          background: "opaque",
          output_format: "png",
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI image gen error:", response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded.", imageBase64: null }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Image generation error ${response.status}`, imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const imageData = result?.data?.[0];
    if (!imageData?.b64_json) {
      console.error("No image in OpenAI response:", JSON.stringify(result).substring(0, 400));
      return new Response(JSON.stringify({ error: "No image returned", imageBase64: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ imageBase64: imageData.b64_json, mimeType: "image/png" }),
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
