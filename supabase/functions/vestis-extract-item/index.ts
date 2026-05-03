import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompts(_item: Record<string, unknown>): { prompt: string; negative_prompt: string } {
  // The mask preserves garment pixels — SD only repaints the background area.
  // Prompt describes what the background should become.
  return {
    prompt: "pure white background, clean studio product photography, soft even lighting, no shadow",
    negative_prompt: "shadow, colored background, textured background, gradient, person, model, mannequin, hanger, watermark, blurry, low quality",
  };
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const tempPaths: string[] = [];

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

    const { item, croppedImageBase64, maskBase64 } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "Missing item details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!croppedImageBase64 || !maskBase64) {
      return new Response(JSON.stringify({ error: "Missing croppedImageBase64 or maskBase64" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PIXAZO_API_KEY = Deno.env.get("PIXAZO_API_KEY");
    if (!PIXAZO_API_KEY) throw new Error("PIXAZO_API_KEY is not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upload cropped garment image and white mask to get public URLs for Pixazo
    const tempId = crypto.randomUUID();
    const imagePath = `temp-ai/${tempId}/image.jpg`;
    const maskPath = `temp-ai/${tempId}/mask.png`;
    tempPaths.push(imagePath, maskPath);

    const [imgUpload, maskUpload] = await Promise.all([
      supabaseAdmin.storage
        .from("clothing-images")
        .upload(imagePath, base64ToBytes(croppedImageBase64), { contentType: "image/jpeg", upsert: true }),
      supabaseAdmin.storage
        .from("clothing-images")
        .upload(maskPath, base64ToBytes(maskBase64), { contentType: "image/png", upsert: true }),
    ]);

    if (imgUpload.error) throw new Error(`Image upload failed: ${imgUpload.error.message}`);
    if (maskUpload.error) throw new Error(`Mask upload failed: ${maskUpload.error.message}`);

    // clothing-images is a private bucket — create short-lived signed URLs for Pixazo to fetch
    const [{ data: imgSigned, error: imgSignErr }, { data: maskSigned, error: maskSignErr }] = await Promise.all([
      supabaseAdmin.storage.from("clothing-images").createSignedUrl(imagePath, 600),
      supabaseAdmin.storage.from("clothing-images").createSignedUrl(maskPath, 600),
    ]);
    if (imgSignErr || !imgSigned?.signedUrl) throw new Error(`Failed to sign image URL: ${imgSignErr?.message}`);
    if (maskSignErr || !maskSigned?.signedUrl) throw new Error(`Failed to sign mask URL: ${maskSignErr?.message}`);

    const imagePublicUrl = imgSigned.signedUrl;
    const maskPublicUrl = maskSigned.signedUrl;

    const { prompt, negative_prompt } = buildPrompts(item as Record<string, unknown>);

    const pixazoRes = await fetch("https://gateway.pixazo.ai/inpainting/v1/getImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Ocp-Apim-Subscription-Key": PIXAZO_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        imageUrl: imagePublicUrl,
        maskUrl: maskPublicUrl,
        negative_prompt,
        height: 1024,
        width: 1024,
        num_steps: 20,
        guidance: 7,
        seed: Math.floor(Math.random() * 1000000),
      }),
    });

    if (!pixazoRes.ok) {
      const body = await pixazoRes.text();
      throw new Error(`Pixazo API error ${pixazoRes.status}: ${body}`);
    }

    const pixazoData = await pixazoRes.json();
    const resultUrl = pixazoData?.imageUrl;
    if (!resultUrl) throw new Error("No imageUrl in Pixazo response");

    const imgRes = await fetch(resultUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch generated image: ${imgRes.status}`);

    const imageBase64 = await arrayBufferToBase64(await imgRes.arrayBuffer());

    return new Response(
      JSON.stringify({ imageBase64, mimeType: "image/png" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("vestis-extract-item error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", imageBase64: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } finally {
    // Clean up temp storage files
    if (tempPaths.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabaseAdmin.storage.from("clothing-images").remove(tempPaths).catch(() => {});
    }
  }
});
