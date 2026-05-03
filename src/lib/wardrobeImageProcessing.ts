/**
 * Wardrobe image processing: background removal for wardrobe item uploads.
 * Uses @imgly/background-removal client-side; no server-side edge function calls.
 */

import { supabase } from "@/integrations/supabase/client";
import { processClothingImage } from "@/lib/image-processing";

const MAX_LONG_EDGE = 2000;
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


export interface ProcessBackgroundRemovalOptions {
  itemId: string;
  imageUrl: string;
  userId: string;
  /** When provided, skip fetching image from URL (avoids CORS). Use for initial add flow. */
  imageBase64ForProcessing?: string;
  /** Set to true on retry calls to run actual background removal. Initial add flow leaves this unset (image already processed). */
  isRetry?: boolean;
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

/** Extract storage path from a Supabase signed URL. */
function getStoragePathFromSignedUrl(signedUrl: string): string | null {
  try {
    const match = signedUrl.match(/\/object\/sign\/clothing-images\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Run background removal for a wardrobe item.
 * - Initial add flow (isRetry unset): image already processed client-side before addItem was called,
 *   so just mark as ready immediately.
 * - Retry flow (isRetry: true): download from storage, run @imgly bg removal (with 1024px downscale),
 *   overwrite file in storage, update DB row, return fresh signed URL.
 */
export async function processBackgroundRemoval(options: ProcessBackgroundRemovalOptions): Promise<void> {
  const { itemId, imageUrl, userId, isRetry, onStatusUpdate } = options;

  if (!isRetry) {
    onStatusUpdate?.({ imageStatus: "ready" });
    return;
  }

  try {
    // 1. Fetch image blob from storage
    let blob: Blob | null = null;
    let storagePath: string | null = null;

    if (imageUrl && !imageUrl.startsWith("http")) {
      // Raw storage path passed directly
      storagePath = imageUrl;
      const { data, error } = await supabase.storage.from("clothing-images").download(storagePath);
      if (!error && data) blob = data;
    }

    if (!blob && imageUrl) {
      storagePath = getStoragePathFromSignedUrl(imageUrl) || getStoragePathFromPublicUrl(imageUrl);
      if (storagePath) {
        const { data, error } = await supabase.storage.from("clothing-images").download(storagePath);
        if (!error && data) blob = data;
      }
    }

    if (!blob && imageUrl?.startsWith("http")) {
      try {
        const resp = await fetch(imageUrl);
        if (resp.ok) blob = await resp.blob();
      } catch { /* ignore CORS errors, fall through to failure */ }
    }

    if (!blob) throw new Error("Could not fetch image for processing");

    // 2. Run background removal (processClothingImage includes 1024px downscale)
    const file = new File([blob], "clothing.png", { type: blob.type || "image/png" });
    const processedBlob = await processClothingImage(file);

    // 3. Overwrite original file in storage with processed PNG
    const uploadPath = storagePath || `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(uploadPath, processedBlob, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;

    // 4. Update DB row
    await supabase
      .from("clothing_items")
      .update({ image_url: uploadPath, image_status: "ready", image_error: null } as any)
      .eq("id", itemId)
      .eq("user_id", userId);

    // 5. Fresh signed URL so the UI shows the updated image immediately
    const { data: signedData } = await supabase.storage
      .from("clothing-images")
      .createSignedUrl(uploadPath, 3600);

    onStatusUpdate?.({ imageUrl: signedData?.signedUrl ?? undefined, imageStatus: "ready" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    console.error("[BG removal retry] Failed:", err);
    try {
      await supabase
        .from("clothing_items")
        .update({ image_status: "failed", image_error: msg } as any)
        .eq("id", itemId)
        .eq("user_id", userId);
    } catch { /* ignore — we still need to notify the UI */ }
    onStatusUpdate?.({ imageStatus: "failed", imageError: msg });
  }
}
