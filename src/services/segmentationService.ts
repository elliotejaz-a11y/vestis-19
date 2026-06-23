import { supabase } from "@/integrations/supabase/client";

export interface SegmentationRequestItem {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface SegmentationSuccessResult {
  id: string;
  status: "segmented";
  imageBase64: string;
}

export interface SegmentationFailureResult {
  id: string;
  status: "failed";
  reason: string;
}

export type SegmentationResult = SegmentationSuccessResult | SegmentationFailureResult;

/**
 * Calls the vestis-segment-pile edge function, which runs Meta's SAM2 model
 * on the full pile photo and returns one real pixel cutout per requested
 * item (matched to each item's bbox), or a failure reason if no SAM2 mask
 * could be matched confidently to that item.
 */
export async function segmentPileItems(
  imageBase64: string,
  items: SegmentationRequestItem[],
): Promise<SegmentationResult[]> {
  const { data, error } = await supabase.functions.invoke("vestis-segment-pile", {
    body: { imageBase64, items },
  });
  if (error) throw new Error(error.message || "Segmentation request failed");
  if (data?.error) throw new Error(String(data.error));
  if (!Array.isArray(data?.results)) throw new Error("No segmentation results returned");
  return data.results as SegmentationResult[];
}
