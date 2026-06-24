import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ItemMetadata {
  name: string;
  category: string;
  colour: string;
  fabric: string;
}

function buildPrompt(item: ItemMetadata): string {
  const pose = (() => {
    const cat = item.category.toLowerCase();
    if (cat === "bottoms") return "flat-lay with both legs straight and parallel, waistband at top";
    if (cat === "shoes") return "pair of shoes, three-quarter front product view";
    if (cat === "hats") return "single hat, front-facing product view";
    if (cat === "accessories") return "single accessory, centred product view";
    return "front-facing flat-lay, fully spread out showing the entire front";
  })();

  return `Transform this clothing item cutout into a professional e-commerce product photograph. ${item.name}, ${item.colour}, ${item.fabric}. Pose: ${pose}. Pure white studio background, soft even overhead lighting, subtle natural shadow beneath. Item centred and fills 80% of the frame. Sharp focus, clean product-photography realism. No model, no mannequin, no hanger, no background clutter, no text, no watermarks.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorised" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorised" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const imageBase64: unknown = body?.imageBase64;
    const rawItem: unknown = body?.item;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!rawItem || typeof rawItem !== "object") {
      return new Response(JSON.stringify({ error: "No item metadata provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support both naming conventions present across staging/production
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_AI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const meta = rawItem as Record<string, unknown>;
    const item: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    const prompt = buildPrompt(item);
    console.log(`vestis-flatten-item: editing "${item.name}" → flat-lay`);

    // Send the SAM2 cutout directly to gpt-image-1 as an image edit.
    // The model sees the real garment and generates a clean studio flat-lay.
    const imageBytes = decodeBase64(imageBase64);
    const imageBlob = new Blob([imageBytes], { type: "image/png" });

    const formData = new FormData();
    formData.append("image[]", imageBlob, "cutout.png");
    formData.append("prompt", prompt);
    formData.append("model", "gpt-image-1");
    formData.append("size", "1024x1024");
    formData.append("n", "1");
    formData.append("quality", "medium");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("gpt-image-1 edit error:", response.status, text.substring(0, 400));
      let message = `Image edit error ${response.status}`;
      try {
        const payload = JSON.parse(text);
        message = payload?.error?.message ?? message;
      } catch { /* keep generic message */ }
      return new Response(JSON.stringify({ error: message }), {
        status: response.status === 429 ? 429 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("No image in gpt-image-1 response:", JSON.stringify(result).substring(0, 400));
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ imageBase64: b64, mimeType: "image/png" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-flatten-item error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
