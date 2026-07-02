import { supabase } from "@/integrations/supabase/client";

export interface FlatLayItemMetadata {
  name: string;
  category: string;
  colour: string;
  fabric: string;
}

/**
 * Sends the SAM2 cutout to vestis-flatten-item, which uses FLUX Kontext to
 * transform the real garment into a clean studio flat-lay while preserving
 * its exact design, colours, and details. Returns the result as base64.
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
