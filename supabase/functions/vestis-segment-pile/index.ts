import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as encodeBase64, decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pinned to meta/sam-2's latest_version as of integration time. Replicate's hosted
// model only exposes automatic whole-image segmentation (no box/point prompts), so
// items are matched to masks by bbox overlap rather than prompted directly — see
// matchItemsToMasks. Check https://replicate.com/meta/sam-2 before bumping this.
const SAM2_MODEL_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83";

const REPLICATE_POLL_INTERVAL_MS = 1500;
const REPLICATE_MAX_WAIT_MS = 50_000;

// Minimum bbox-to-mask overlap required to accept a match. Gemini's bbox is only
// approximate, so this is deliberately lenient rather than requiring a near-exact box.
const MIN_MATCH_IOU = 0.25;

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SegmentationRequestItem {
  id: string;
  bbox: BoundingBox;
}

interface SegmentationSuccess {
  id: string;
  status: "segmented";
  imageBase64: string;
}

interface SegmentationFailure {
  id: string;
  status: "failed";
  reason: string;
}

type SegmentationResult = SegmentationSuccess | SegmentationFailure;

interface PixelRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface MaskEntry {
  mask: Image;
  rect: PixelRect;
  used: boolean;
}

interface ReplicatePredictionResponse {
  id: string;
  status: string;
  error?: string;
  output?: { individual_masks?: string[] };
}

function rectIoU(a: PixelRect, b: PixelRect): number {
  const ix1 = Math.max(a.minX, b.minX);
  const iy1 = Math.max(a.minY, b.minY);
  const ix2 = Math.min(a.maxX, b.maxX);
  const iy2 = Math.min(a.maxY, b.maxY);
  if (ix2 < ix1 || iy2 < iy1) return 0;
  const interArea = (ix2 - ix1 + 1) * (iy2 - iy1 + 1);
  const areaA = (a.maxX - a.minX + 1) * (a.maxY - a.minY + 1);
  const areaB = (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1);
  return interArea / (areaA + areaB - interArea);
}

// Scans the mask's raw bitmap directly (not the 1-indexed getPixelAt API) for speed —
// confirmed via local testing that this single pass over a ~1600px image takes single-digit ms.
function maskForegroundBbox(mask: Image): PixelRect | null {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  const { width, height, bitmap } = mask;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (bitmap[rowOffset + x * 4] > 127) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX === -1 ? null : { minX, minY, maxX, maxY };
}

function bboxToPixelRect(bbox: BoundingBox, imgWidth: number, imgHeight: number): PixelRect {
  const minX = Math.max(0, Math.round(bbox.x * imgWidth));
  const minY = Math.max(0, Math.round(bbox.y * imgHeight));
  const maxX = Math.min(imgWidth - 1, Math.round((bbox.x + bbox.width) * imgWidth));
  const maxY = Math.min(imgHeight - 1, Math.round((bbox.y + bbox.height) * imgHeight));
  return { minX, minY, maxX, maxY };
}

// Composites the mask's alpha against the original photo's real pixels, cropped
// tightly to the mask's bounding box — this is the actual SAM2 cutout, not a
// generated re-creation.
function compositeCutout(original: Image, mask: Image, rect: PixelRect): Image {
  const w = rect.maxX - rect.minX + 1;
  const h = rect.maxY - rect.minY + 1;
  const out = new Image(w, h);
  const srcBitmap = original.bitmap;
  const maskBitmap = mask.bitmap;
  const outBitmap = out.bitmap;
  const srcWidth = original.width;
  const maskWidth = mask.width;

  for (let y = 0; y < h; y++) {
    const srcY = rect.minY + y;
    for (let x = 0; x < w; x++) {
      const srcX = rect.minX + x;
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const maskIdx = (srcY * maskWidth + srcX) * 4;
      const outIdx = (y * w + x) * 4;
      const alpha = maskBitmap[maskIdx] > 127 ? 255 : 0;
      outBitmap[outIdx] = srcBitmap[srcIdx];
      outBitmap[outIdx + 1] = srcBitmap[srcIdx + 1];
      outBitmap[outIdx + 2] = srcBitmap[srcIdx + 2];
      outBitmap[outIdx + 3] = alpha;
    }
  }
  return out;
}

function buildMaskEntries(maskImages: (Image | null)[], originalWidth: number, originalHeight: number): MaskEntry[] {
  const entries: MaskEntry[] = [];
  for (const mask of maskImages) {
    if (!mask) continue;
    if (mask.width !== originalWidth || mask.height !== originalHeight) continue;
    const rect = maskForegroundBbox(mask);
    if (!rect) continue;
    entries.push({ mask, rect, used: false });
  }
  return entries;
}

// Greedily assigns each item to its best-overlapping unused mask. SAM2's automatic
// generator returns unlabelled masks, so this is how each Gemini-identified item gets
// matched to the real mask that corresponds to it.
async function matchAndComposite(
  original: Image,
  maskEntries: MaskEntry[],
  items: SegmentationRequestItem[],
): Promise<SegmentationResult[]> {
  const results: SegmentationResult[] = [];

  for (const item of items) {
    const itemRect = bboxToPixelRect(item.bbox, original.width, original.height);
    let bestIoU = 0;
    let bestEntry: MaskEntry | null = null;
    for (const entry of maskEntries) {
      if (entry.used) continue;
      const iou = rectIoU(itemRect, entry.rect);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestEntry = entry;
      }
    }

    if (!bestEntry || bestIoU < MIN_MATCH_IOU) {
      results.push({ id: item.id, status: "failed", reason: "Could not isolate this item cleanly from the photo" });
      continue;
    }

    bestEntry.used = true;
    try {
      const cutout = compositeCutout(original, bestEntry.mask, bestEntry.rect);
      const encoded = await cutout.encode();
      results.push({ id: item.id, status: "segmented", imageBase64: encodeBase64(new Uint8Array(encoded).buffer) });
    } catch (err) {
      results.push({
        id: item.id,
        status: "failed",
        reason: err instanceof Error ? err.message : "Could not compose this item's cutout",
      });
    }
  }

  return results;
}

async function createPrediction(imageDataUri: string, token: string): Promise<string> {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: SAM2_MODEL_VERSION,
      input: {
        image: imageDataUri,
        points_per_side: 32,
        pred_iou_thresh: 0.88,
        stability_score_thresh: 0.95,
        use_m2m: true,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate prediction create failed [${res.status}]: ${text.substring(0, 400)}`);
  }
  const json: ReplicatePredictionResponse = await res.json();
  return json.id;
}

async function pollPredictionMasks(id: string, token: string): Promise<string[]> {
  const deadline = Date.now() + REPLICATE_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate prediction poll failed [${res.status}]: ${text.substring(0, 400)}`);
    }
    const json: ReplicatePredictionResponse = await res.json();
    if (json.status === "succeeded") {
      const masks = json.output?.individual_masks;
      if (!Array.isArray(masks)) throw new Error("Replicate returned no individual_masks");
      return masks;
    }
    if (json.status === "failed" || json.status === "canceled") {
      throw new Error(`Replicate segmentation ${json.status}: ${json.error ?? "unknown error"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, REPLICATE_POLL_INTERVAL_MS));
  }
  throw new Error("Replicate segmentation timed out");
}

function parseRequestItems(raw: unknown): SegmentationRequestItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SegmentationRequestItem[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).id === "string" &&
      typeof (entry as Record<string, unknown>).bbox === "object"
    ) {
      const bbox = (entry as Record<string, unknown>).bbox as Record<string, unknown>;
      if (
        typeof bbox.x === "number" &&
        typeof bbox.y === "number" &&
        typeof bbox.width === "number" &&
        typeof bbox.height === "number"
      ) {
        items.push({
          id: (entry as Record<string, unknown>).id as string,
          bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
        });
      }
    }
  }
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const body = await req.json();
    const imageBase64 = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = parseRequestItems(body?.items);
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "No valid items provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    const predictionId = await createPrediction(`data:image/jpeg;base64,${imageBase64}`, REPLICATE_API_TOKEN);
    const maskUrls = await pollPredictionMasks(predictionId, REPLICATE_API_TOKEN);

    if (maskUrls.length === 0) {
      const results: SegmentationResult[] = items.map((item) => ({
        id: item.id,
        status: "failed",
        reason: "Could not isolate any items in this photo",
      }));
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const original = await Image.decode(decodeBase64(imageBase64));

    const maskImages = await Promise.all(
      maskUrls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await Image.decode(new Uint8Array(await res.arrayBuffer()));
        } catch {
          return null;
        }
      }),
    );

    const maskEntries = buildMaskEntries(maskImages, original.width, original.height);
    const results = await matchAndComposite(original, maskEntries, items);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("vestis-segment-pile error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
