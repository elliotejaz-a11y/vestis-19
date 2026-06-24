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

interface GeminiInlinePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface GeminiTextPart {
  text: string;
}

type GeminiPart = GeminiTextPart | GeminiInlinePart;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

function isInlinePart(part: GeminiPart): part is GeminiInlinePart {
  return "inlineData" in part;
}

function buildPrompt(item: ItemMetadata): string {
  const posing = (() => {
    const cat = item.category.toLowerCase();
    if (cat === "bottoms") return "front-facing flat-lay with both legs straight and parallel, waistband at top";
    if (cat === "shoes") return "pair of shoes, centred, three-quarter front product view";
    if (cat === "hats") return "single hat, centred, front-facing product view";
    if (cat === "accessories") return "single accessory, centred product view";
    return "front-facing flat-lay, fully spread out showing the entire front of the garment";
  })();

  return `You are given a real cutout of a clothing item extracted from a photo — the garment is isolated with a transparent background showing the actual fabric, colour, and texture.

Item: ${item.name}
Category: ${item.category}
Colour: ${item.colour}
Fabric: ${item.fabric}

Generate a professional e-commerce product photograph of this exact garment. Render it as a clean studio flat-lay on a pure white background. Pose: ${posing}. Use soft, even studio lighting with a subtle natural shadow. The item should be centred and fill about 80% of the frame. Sharp focus, clean product-photography realism. No model, no mannequin, no hanger, no background clutter, no floor, no text, no watermarks.`;
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
    const item: unknown = body?.item;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "No item metadata provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const meta = item as Record<string, unknown>;
    const metadata: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: buildPrompt(metadata) },
                { inlineData: { mimeType: "image/png", data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini flat-lay error:", response.status, text.substring(0, 400));
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error ${response.status}: ${text.substring(0, 200)}`);
    }

    const result: GeminiResponse = await response.json();

    if (result.error) {
      throw new Error(result.error.message ?? "Gemini returned an error");
    }

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => isInlinePart(p) && p.inlineData.mimeType.startsWith("image/"));

    if (!imagePart || !isInlinePart(imagePart)) {
      console.error("No image part in Gemini response:", JSON.stringify(result).substring(0, 400));
      return new Response(JSON.stringify({ error: "No image returned from Gemini" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      }),
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
