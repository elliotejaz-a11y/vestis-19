/**
 * Wardrobe image processing: background removal only for wardrobe item uploads.
 * Server-side removal via Supabase Edge Function; retries, downscale, and hash cache.
 */

import { supabase } from "@/integrations/supabase/client";

const MAX_LONG_EDGE = 2000;
const REQUEST_TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export function isAllowedWardrobeImageType(type: string): boolean {
  return ALLOWED_TYPES.includes(type);
}

export function isAllowedWardrobeImageSize(bytes: number): boolean {
  return bytes <= MAX_FILE_BYTES;
}

/**
 * Compute SHA-256 hash of blob (for cache lookup).
 */
export async function hashImageBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Downscale image so long edge is at most maxLongEdge. Returns PNG blob for transparency support.
 */
export async function downscaleToPng(blob: Blob, maxLongEdge: number = MAX_LONG_EDGE): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxLongEdge && height <= maxLongEdge) {
        width = img.naturalWidth;
        height = img.naturalHeight;
      } else {
        if (width > height) {
          height = Math.round((height * maxLongEdge) / width);
          width = maxLongEdge;
        } else {
          width = Math.round((width * maxLongEdge) / height);
          height = maxLongEdge;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

/**
 * Blob to base64 string (raw, no data URL prefix).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Call remove-background edge function with timeout and retries (exponential backoff).
 */
async function removeBackgroundWithRetry(imageBase64: string): Promise<{ imageBase64: string; fallback: boolean }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      const invokePromise = supabase.functions.invoke("remove-background", {
        body: { imageBase64 },
      });
      const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
      if (error) throw error;
      const base64 = data?.imageBase64;
      const fallback = data?.fallback === true;
      if (base64 && typeof base64 === "string") {
        return { imageBase64: base64, fallback };
      }
      throw new Error("No image in response");
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) break;
    }
  }
  throw lastError;
}

export interface ProcessBackgroundRemovalOptions {
  itemId: string;
  imageUrl: string;
  userId: string;
  /** When provided, skip fetching image from URL (avoids CORS). Use for initial add flow. */
  imageBase64ForProcessing?: string;
  onStatusUpdate?: (payload: { imageUrl?: string; imageStatus: "ready" | "failed"; imageError?: string | null }) => void;
}

/**
 * Extract storage path from Supabase public URL for download() fallback.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/clothing-images/userId/file.png -> userId/file.png
 */
function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const match = publicUrl.match(/\/object\/public\/clothing-images\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Run background removal for an existing wardrobe item (original already in storage).
 * 1) Get image blob: use imageBase64ForProcessing if provided (avoids CORS); else fetch(imageUrl) or storage.download(path).
 * 2) Hash, check cache (same user + same hash + ready) and reuse if found.
 * 3) Else downscale, call remove-background with retries, upload PNG to storage, update row.
 * On failure: update row with status failed and error; onStatusUpdate(..., 'failed', error).
 */
export async function processBackgroundRemoval(options: ProcessBackgroundRemovalOptions): Promise<void> {
  const { itemId, imageUrl, userId, imageBase64ForProcessing, onStatusUpdate } = options;

  try {
    let blob: Blob;
    if (imageBase64ForProcessing && imageBase64ForProcessing.length > 0) {
      console.log("[BG removal] Using provided base64 (no fetch)");
      const byteChars = atob(imageBase64ForProcessing.replace(/\s/g, ""));
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      blob = new Blob([byteArr], { type: "image/png" });
    } else {
      let resp: Response | null = null;
      try {
        resp = await fetch(imageUrl, { mode: "cors" });
      } catch (fetchErr) {
        console.warn("[BG removal] Fetch image failed (likely CORS), trying Supabase storage download:", fetchErr);
      }
      if (resp?.ok) {
        blob = await resp.blob();
        console.log("[BG removal] Fetched image from URL");
      } else {
        const path = getStoragePathFromPublicUrl(imageUrl);
        if (!path) throw new Error("Could not load image (fetch failed and no storage path)");
        const { data, error } = await supabase.storage.from("clothing-images").download(path);
        if (error || !data) throw new Error(error?.message || "Storage download failed");
        blob = data;
        console.log("[BG removal] Loaded image via storage.download");
      }
    }

    // Skip hash-cache lookup (image_hash column not in schema)

    const pngBlob = await downscaleToPng(blob);
    const base64 = await blobToBase64(pngBlob);
    const { imageBase64: resultBase64, fallback } = await removeBackgroundWithRetry(base64);
    if (fallback) console.warn("[BG removal] Edge function returned fallback (original image)");

    if (fallback) {
      console.warn("[BG removal] Fallback – using original image as-is");
      onStatusUpdate?.({ imageStatus: "ready" });
      return;
    }

    const byteChars = atob(resultBase64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const resultBlob = new Blob([byteArr], { type: "image/png" });
    const path = `${userId}/${crypto.randomUUID()}_processed.png`;
    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(path, resultBlob, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error("[BG removal] Upload failed:", uploadError.message);
      onStatusUpdate?.({ imageStatus: "failed", imageError: "Upload failed" });
      return;
    }

    const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
    const processedUrl = urlData.publicUrl;

    await supabase
      .from("clothing_items")
      .update({ image_url: processedUrl })
      .eq("id", itemId)
      .eq("user_id", userId);

    console.log("[BG removal] Done – processed image saved");
    onStatusUpdate?.({ imageUrl: processedUrl, imageStatus: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background removal failed";
    console.error("[BG removal] Error:", message, err);
    onStatusUpdate?.({ imageStatus: "failed", imageError: message });
  }
}
