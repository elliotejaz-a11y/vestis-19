import { supabase } from "@/integrations/supabase/client";

export interface ClothingMetadata {
  name: string;
  category: string;
  color: string;
  fabric?: string;
  [key: string]: unknown;
}

/**
 * Calls the vestis-extract-item edge function which crops the garment and
 * generates an AI product photo via Pixazo.ai SD Inpainting.
 *
 * Returns raw PNG base64 (no data-URL prefix), or null on any failure so
 * the caller can apply its own fallback without throwing.
 */
export async function generateClothingImage(
  metadata: ClothingMetadata,
  croppedImageBase64?: string,
  maskBase64?: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("vestis-extract-item", {
      body: { item: metadata, croppedImageBase64: croppedImageBase64 ?? "", maskBase64: maskBase64 ?? "" },
    });
    if (error || !data?.imageBase64) return null;
    return data.imageBase64 as string;
  } catch {
    return null;
  }
}
