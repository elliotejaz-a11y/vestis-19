import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HF_API_URL =
  "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

function buildClothingPrompt(item: Record<string, unknown>): string {
  const name = String(item.name ?? "clothing item");
  const category = String(item.category ?? "").toLowerCase();
  const color = String(item.color ?? "");
  const fabric = String(item.fabric ?? "");

  let prompt = `Professional product photography of a ${color} ${name}`;
  if (fabric && fabric !== "Unknown") prompt += `, ${fabric}`;

  if (category === "bottoms") {
    prompt +=
      `, both legs fully extended straight downward in parallel, waistband at top, flat lay pose`;
  } else if (category === "shoes") {
    prompt += `, three-quarter front view, professional shoe product photography`;
  } else {
    prompt += `, flat lay pose, fully spread out showing front face`;
  }

  prompt +=
    `, pure white background, high resolution studio lighting, clean minimal fashion` +
    ` e-commerce photography, no person, no model, no hanger, isolated clothing item only`;

  return prompt;
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item } = await req.json();

    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const HF_TOKEN = Deno.env.get("HF_TOKEN");
    if (!HF_TOKEN) throw new Error("HF_TOKEN is not configured");

    const prompt = buildClothingPrompt(item as Record<string, unknown>);

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(HF_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_inference_steps: 4,
              width: 512,
              height: 512,
            },
          }),
        });

        if (response.status === 429 || response.status === 503) {
          const waitMs = Math.pow(2, attempt) * 2000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "HuggingFace credits exhausted", imageBase64: null }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`HF API error ${response.status}: ${body}`);
        }

        const imageBase64 = await arrayBufferToBase64(await response.arrayBuffer());

        return new Response(JSON.stringify({ imageBase64 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("Image generation failed after retries");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
