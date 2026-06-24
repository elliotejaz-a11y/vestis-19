import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

interface GeminiTextPart { text: string }
interface GeminiInlinePart { inlineData: { mimeType: string; data: string } }
type GeminiPart = GeminiTextPart | GeminiInlinePart;
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

function isTextPart(p: GeminiPart): p is GeminiTextPart { return "text" in p; }

function poseForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat === "bottoms") return "flat-lay, both legs straight and parallel, waistband at top";
  if (cat === "shoes") return "pair of shoes, three-quarter front product view";
  if (cat === "hats") return "single hat, front-facing";
  if (cat === "accessories") return "single accessory, centred";
  return "front-facing flat-lay, fully spread out, entire front visible";
}

// Step 1: Gemini 2.5 Flash Vision analyses the real SAM2 cutout and produces a
// precise description of the actual garment — colours, prints, texture, details.
async function describeGarment(imageBase64: string, item: ItemMetadata, geminiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Describe this ${item.category} garment for a product photographer. Be precise and visual: cover the exact colours and any patterns, fabric texture and sheen, any logos, prints, graphics, or embroidery, and key structural features (collar type, sleeve length, cut, hardware). Two sentences maximum. Do not say "the image shows" — describe the item directly.`,
            },
            { inlineData: { mimeType: "image/png", data: imageBase64 } },
          ] as GeminiPart[],
        }],
        generationConfig: { maxOutputTokens: 150 },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini vision error ${res.status}: ${text.substring(0, 200)}`);
  }
  const result: GeminiResponse = await res.json();
  if (result.error) throw new Error(result.error.message ?? "Gemini vision error");
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const description = parts.find(isTextPart)?.text?.trim() ?? "";
  if (!description) throw new Error("Gemini returned no description");
  return description;
}

// Step 2: gpt-image-1 generation — same endpoint used by vestis-extract-item
// for outfit mode, proven quality. The Gemini description grounds the prompt in
// the real garment's actual appearance.
async function generateFlatLay(description: string, item: ItemMetadata, openAiKey: string): Promise<string> {
  const pose = poseForCategory(item.category);

  const prompt = `Create a professional e-commerce catalogue product image. ${description} Pose: ${pose}. Pure white studio background, soft even lighting, subtle natural shadow. Item centred and fills 80% of the frame. Sharp focus, clean product-photography realism. No model, no mannequin, no hanger, no background clutter, no text, no watermarks.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("gpt-image-1 generation error:", res.status, text.substring(0, 400));
    let message = `Image generation error ${res.status}`;
    try { message = (JSON.parse(text))?.error?.message ?? message; } catch { /* keep generic */ }
    throw new Error(message);
  }

  const result = await res.json();
  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from gpt-image-1");
  return b64;
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_AI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const meta = rawItem as Record<string, unknown>;
    const item: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    // Step 1: analyse the real garment cutout with Gemini Vision
    const description = await describeGarment(imageBase64, item, GEMINI_API_KEY);
    console.log(`vestis-flatten-item: "${description.substring(0, 100)}"`);

    // Step 2: generate a clean studio flat-lay with gpt-image-1
    const flatLayBase64 = await generateFlatLay(description, item, OPENAI_API_KEY);

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
