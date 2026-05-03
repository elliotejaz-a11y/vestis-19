import { supabase } from "@/integrations/supabase/client";

export interface ClothingMetadata {
  name: string;
  category: string;
  color: string;
  fabric?: string;
  [key: string]: unknown;
}

/**
 * Optional: calls the vestis-extract-item edge function (Pixazo SD Inpainting)
 * to generate an AI product photo. This is NOT used in the primary mass-upload
 * pipeline — the free client-side bg-removal + soft-shadow path is used instead.
 * Kept here for future opt-in / power-user use.
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
