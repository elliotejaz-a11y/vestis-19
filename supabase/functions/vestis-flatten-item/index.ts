import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPLICATE_POLL_INTERVAL_MS = 1500;
const REPLICATE_MAX_WAIT_MS = 90_000;

interface ItemMetadata {
  name: string;
  category: string;
  colour: string;
  fabric: string;
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: { get?: string };
}

function buildPrompt(item: ItemMetadata): string {
  const pose = (() => {
    const cat = item.category.toLowerCase();
    if (cat === "bottoms") return "flat-lay with legs straight, waistband at top";
    if (cat === "shoes") return "pair of shoes, three-quarter front view";
    if (cat === "hats") return "front-facing flat-lay";
    if (cat === "accessories") return "centred product view";
    return "front-facing flat-lay, fully spread out";
  })();

  return [
    `Professional e-commerce product photograph, ${pose}.`,
    `${item.name}, ${item.colour}, ${item.fabric}.`,
    `Pure white studio background, soft even overhead lighting, subtle shadow beneath.`,
    `Item centred and fills 80% of the frame. Sharp focus, photorealistic.`,
    `No model, no mannequin, no hanger, no background clutter, no text, no watermarks.`,
  ].join(" ");
}

async function pollPrediction(predictionId: string, getUrl: string, token: string): Promise<ReplicatePrediction> {
  const deadline = Date.now() + REPLICATE_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, REPLICATE_POLL_INTERVAL_MS));
    const res = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll failed [${res.status}]: ${text.substring(0, 200)}`);
    }
    const prediction: ReplicatePrediction = await res.json();
    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      return prediction;
    }
  }
  throw new Error(`FLUX img2img timed out after ${REPLICATE_MAX_WAIT_MS / 1000}s`);
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

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    const meta = rawItem as Record<string, unknown>;
    const item: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    const prompt = buildPrompt(item);
    console.log(`vestis-flatten-item: generating flat-lay for "${item.name}"`);

    // Send the SAM2 cutout directly to FLUX 1.1 Pro as an img2img input.
    // The model sees the real garment and transforms it into a clean studio flat-lay.
    const createRes = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            image: `data:image/png;base64,${imageBase64}`,
            prompt_strength: 0.8,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 90,
            safety_tolerance: 2,
          },
        }),
      },
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`Replicate FLUX create failed [${createRes.status}]: ${text.substring(0, 300)}`);
    }

    let prediction: ReplicatePrediction = await createRes.json();

    // Poll if Prefer: wait didn't return a completed prediction
    if (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
      const getUrl = prediction.urls?.get ?? `https://api.replicate.com/v1/predictions/${prediction.id}`;
      prediction = await pollPrediction(prediction.id, getUrl, REPLICATE_API_TOKEN);
    }

    if (prediction.status !== "succeeded") {
      throw new Error(`FLUX generation ${prediction.status}: ${prediction.error ?? "unknown error"}`);
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) throw new Error("FLUX returned no output URL");

    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) throw new Error(`Failed to download generated image [${imgRes.status}]`);
    const flatLayBase64 = encodeBase64(await imgRes.arrayBuffer());

    return new Response(
      JSON.stringify({ imageBase64: flatLayBase64, mimeType: "image/png" }),
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
