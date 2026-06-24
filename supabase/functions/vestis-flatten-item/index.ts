import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPLICATE_POLL_INTERVAL_MS = 1500;
const REPLICATE_MAX_WAIT_MS = 60_000;

interface ItemMetadata {
  name: string;
  category: string;
  colour: string;
  fabric: string;
}

interface GeminiTextPart {
  text: string;
}

interface GeminiInlinePart {
  inlineData: { mimeType: string; data: string };
}

type GeminiPart = GeminiTextPart | GeminiInlinePart;

interface GeminiGenerateResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: { get?: string };
}

function isTextPart(p: GeminiPart): p is GeminiTextPart {
  return "text" in p;
}

function poseForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat === "bottoms") return "flat-lay with both legs straight and parallel, waistband at top";
  if (cat === "shoes") return "pair of shoes centred, three-quarter front view";
  if (cat === "hats") return "single hat centred, front-facing";
  if (cat === "accessories") return "single accessory centred";
  return "front-facing flat-lay fully spread out, entire front of garment visible";
}

// Step 1 — use Gemini 2.5 Flash Vision to produce a rich visual description
// of the real SAM2 cutout, capturing exact colours, texture, print details, etc.
async function describeGarment(
  imageBase64: string,
  item: ItemMetadata,
  geminiKey: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Describe this ${item.category} garment for an e-commerce product photographer who cannot see the image. Be precise and visual. Cover: exact colours and any colour patterns, visible fabric texture and sheen, any logos, graphics, prints, or embroidery, and key structural features (collar, sleeves, cut, hardware). Two sentences maximum. Do not say "the image shows" — describe the item directly.`,
            },
            { inlineData: { mimeType: "image/png", data: imageBase64 } },
          ] as GeminiPart[],
        }],
        generationConfig: { maxOutputTokens: 150 },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini vision error ${response.status}: ${text.substring(0, 200)}`);
  }

  const result: GeminiGenerateResponse = await response.json();
  if (result.error) throw new Error(result.error.message ?? "Gemini vision returned an error");

  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const description = parts.find(isTextPart)?.text?.trim() ?? "";
  if (!description) throw new Error("Gemini vision returned no description");
  return description;
}

// Step 2 — use Replicate FLUX 1.1 Pro to generate a clean studio flat-lay
// from the Gemini-produced garment description.
async function generateWithFlux(
  description: string,
  item: ItemMetadata,
  replicateToken: string,
): Promise<string> {
  const pose = poseForCategory(item.category);

  const prompt = [
    `Professional e-commerce product photograph, studio flat-lay.`,
    description,
    `Pose: ${pose}.`,
    `Pure white background, soft even overhead lighting, subtle shadow beneath.`,
    `Item centred, fills 80% of frame. Sharp focus, photorealistic.`,
    `No model, no mannequin, no hanger, no background clutter, no text, no watermarks.`,
  ].join(" ");

  // Create the prediction
  const createRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
        safety_tolerance: 2,
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Replicate FLUX create failed [${createRes.status}]: ${text.substring(0, 300)}`);
  }

  let prediction: ReplicatePrediction = await createRes.json();

  // Poll if not already completed (Prefer: wait may return immediately on some plans)
  const deadline = Date.now() + REPLICATE_MAX_WAIT_MS;
  while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
    if (Date.now() > deadline) throw new Error("FLUX generation timed out");
    await new Promise((r) => setTimeout(r, REPLICATE_POLL_INTERVAL_MS));

    const pollUrl = prediction.urls?.get ?? `https://api.replicate.com/v1/predictions/${prediction.id}`;
    const pollRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${replicateToken}` } });
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`Replicate poll failed [${pollRes.status}]: ${text.substring(0, 200)}`);
    }
    prediction = await pollRes.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`FLUX generation ${prediction.status}: ${prediction.error ?? "unknown error"}`);
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) throw new Error("FLUX returned no output URL");

  // Download the generated image and return as base64
  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) throw new Error(`Failed to download generated image [${imgRes.status}]`);
  const imgBuffer = await imgRes.arrayBuffer();
  return encodeBase64(imgBuffer);
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    const meta = rawItem as Record<string, unknown>;
    const item: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    // Step 1: Gemini 2.5 Flash Vision — describe the real garment cutout
    const description = await describeGarment(imageBase64, item, GEMINI_API_KEY);
    console.log(`vestis-flatten-item: "${description.substring(0, 100)}..."`);

    // Step 2: Replicate FLUX 1.1 Pro — generate the studio flat-lay
    const flatLayBase64 = await generateWithFlux(description, item, REPLICATE_API_TOKEN);

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
