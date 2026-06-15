import { supabase } from "@/integrations/supabase/client";

export interface ClothingMetadata {
  name: string;
  category: string;
  color: string;
  fabric?: string;
  [key: string]: unknown;
}

/**
 * Calls the vestis-extract-item edge function to generate a clean studio
 * flatlay from detected item metadata before client-side background removal.
 */
export async function generateClothingImage(
  metadata: ClothingMetadata,
  maskBase64?: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("vestis-extract-item", {
      body: { item: metadata, maskBase64: maskBase64 ?? "" },
    });
    if (error) throw new Error(error.message || "Image generation request failed");
    if (data?.error) throw new Error(String(data.error));
    if (!data?.imageBase64) throw new Error("No generated image returned");
    return data.imageBase64 as string;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Image generation failed");
  }
}
