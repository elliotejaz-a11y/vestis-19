import { supabase } from "@/integrations/supabase/client";

export interface ClothingMetadata {
  name: string;
  category: string;
  color: string;
  fabric?: string;
  [key: string]: unknown;
}

/**
 * Returns the FLUX prompt that will be sent to the edge function.
 * Exported for debugging/preview purposes.
 */
export function buildClothingPrompt(metadata: ClothingMetadata): string {
  const { name, category, color, fabric } = metadata;
  let prompt = `Professional product photography of a ${color} ${name}`;
  if (fabric && fabric !== "Unknown") prompt += `, ${fabric}`;
  if (category) prompt += `, ${category}`;
  prompt +=
    `, displayed as a flat lay on a pure white background, high resolution` +
    ` studio lighting, clean minimal fashion e-commerce photography,` +
    ` no person, no model, isolated clothing item only`;
  return prompt;
}

/**
 * Calls the extract-pile-item edge function which generates a product-style
 * image via HuggingFace FLUX.1-schnell (free tier).
 *
 * Returns raw PNG base64 (no data-URL prefix), or null on any failure so
 * the caller can apply its own fallback without throwing.
 */
export async function generateClothingImage(
  metadata: ClothingMetadata,
  sourceBase64?: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("extract-pile-item", {
      body: { item: metadata, sourceImageBase64: sourceBase64 ?? "" },
    });
    if (error || !data?.imageBase64) return null;
    return data.imageBase64 as string;
  } catch {
    return null;
  }
}
