import { supabase } from "@/integrations/supabase/client";

export interface FlatLayItemMetadata {
  name: string;
  category: string;
  colour: string;
  fabric: string;
}

/**
 * Sends the SAM2 cutout PNG (base64) to vestis-flatten-item, which calls
 * Gemini 2.5 Flash Image to generate a professional studio flat-lay of the
 * same garment. Returns the generated image as base64.
 *
 * Throws if the edge function returns an error or no image.
 */
export async function generateFlatLay(
  cutoutBase64: string,
  item: FlatLayItemMetadata,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("vestis-flatten-item", {
    body: { imageBase64: cutoutBase64, item },
  });
  if (error) throw new Error(error.message || "Flat-lay generation request failed");
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.imageBase64 !== "string") throw new Error("No image returned from flat-lay generator");
  return data.imageBase64;
}
