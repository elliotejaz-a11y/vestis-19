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

function buildPrompt(item: ItemMetadata): string {
  const pose = (() => {
    const cat = item.category.toLowerCase();
    if (cat === "bottoms") return "flat-lay, both legs straight and parallel, waistband at top";
    if (cat === "shoes") return "pair of shoes, three-quarter front product view";
    if (cat === "hats") return "hat, front-facing product view";
    if (cat === "accessories") return "single accessory, centred product view";
    return "front-facing flat-lay, fully spread out showing the entire front";
  })();

  return `Professional e-commerce product photograph of the exact same ${item.category} garment shown in the reference image. ${pose}. Pure white studio background, soft even overhead lighting, subtle natural shadow beneath. Item centred and fills 80% of the frame. Preserve exact colours, patterns, and design details from the reference. Sharp focus, clean product-photography realism. No model, no mannequin, no hanger, no background clutter, no text, no watermarks.`;
}

interface FalImage { url: string; width?: number; height?: number; content_type?: string }
interface FalResponse { images?: FalImage[]; error?: string; detail?: string | { msg: string }[] }

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

    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) throw new Error("FAL_KEY is not configured");

    const meta = rawItem as Record<string, unknown>;
    const item: ItemMetadata = {
      name: String(meta.name ?? "clothing item"),
      category: String(meta.category ?? ""),
      colour: String(meta.colour ?? ""),
      fabric: String(meta.fabric ?? ""),
    };

    console.log(`vestis-flatten-item: flat-lay for "${item.name}" via fal.ai ideogram/v3`);

    // Send the SAM2 cutout as an image reference alongside the flat-lay prompt.
    // Ideogram v3 on fal.ai accepts data URIs as image_url.
    const falRes = await fetch("https://fal.run/fal-ai/ideogram/v3", {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: buildPrompt(item),
        image_url: `data:image/png;base64,${imageBase64}`,
        aspect_ratio: "SQUARE_1_1",
        style: "REALISTIC",
        rendering_quality: "QUALITY",
      }),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      console.error("fal.ai error:", falRes.status, text.substring(0, 600));
      let message = `fal.ai error ${falRes.status}`;
      try {
        const parsed: FalResponse = JSON.parse(text);
        if (typeof parsed.detail === "string") message = parsed.detail;
        else if (Array.isArray(parsed.detail)) message = parsed.detail.map((d) => d.msg).join("; ");
        else if (parsed.error) message = parsed.error;
      } catch { /* keep generic */ }
      return new Response(JSON.stringify({ error: message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const falResult: FalResponse = await falRes.json();
    const imageUrl = falResult.images?.[0]?.url;

    if (!imageUrl) {
      console.error("No image URL in fal.ai response:", JSON.stringify(falResult).substring(0, 400));
      return new Response(JSON.stringify({ error: "fal.ai returned no image" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the generated image and return it as base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

    // Convert to base64
    let binary = "";
    for (let i = 0; i < imgBytes.length; i++) binary += String.fromCharCode(imgBytes[i]);
    const b64 = btoa(binary);

    const contentType = falResult.images?.[0]?.content_type ?? "image/jpeg";

    return new Response(
      JSON.stringify({ imageBase64: b64, mimeType: contentType }),
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
