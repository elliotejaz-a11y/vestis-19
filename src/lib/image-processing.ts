import { removeBackground, type Config } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT_MS = 60_000;

const bgRemovalConfig: Config = {
  model: "isnet_quint8",
  output: {
    format: "image/png",
    quality: 0.9,
  },
  progress: (key, current, total) => {
    if (total > 0) {
      console.log(`[bg-removal] ${key}: ${Math.round((current / total) * 100)}%`);
    }
  },
};

/** Downscale a blob so its long edge is at most 1024px, outputting PNG. */
async function downscaleToMax1024(input: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(input);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => resolve(b ?? input), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(input); };
    img.src = url;
  });
}

/** Singleton warm-up promise so model assets are fetched once & cached. */
let preloadPromise: Promise<void> | null = null;

/**
 * Pre-download the ONNX model + WASM runtime in the background so the first
 * real removal call doesn't pay the full download cost. Safe to call
 * multiple times – only the first invocation triggers a fetch.
 */
export function preloadBgRemovalModel(): void {
  if (preloadPromise) return;
  preloadPromise = (async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/png")
      );
      await removeBackground(blob, bgRemovalConfig);
      console.log("[bg-removal] Model preloaded & cached");
    } catch (err) {
      console.warn("[bg-removal] Preload failed (non-fatal):", err);
      preloadPromise = null;
    }
  })();
}

/**
 * Remove the background from a clothing image.
 * Downscales to max 1024px before inference (4–16× faster on phone photos).
 * Returns a transparent PNG blob on success, or the original file as fallback.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    console.log("[processClothingImage] Downscaling to max 1024px…");
    const downscaled = await downscaleToMax1024(file);

    console.log("[processClothingImage] Starting background removal…");
    const removalPromise = removeBackground(downscaled, bgRemovalConfig);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Background removal timed out")), BG_REMOVAL_TIMEOUT_MS)
    );

    const result = await Promise.race([removalPromise, timeoutPromise]);
    console.log("[processClothingImage] Background removal succeeded");
    return result;
  } catch (err) {
    console.warn("[processClothingImage] Background removal failed, returning original:", err);
    return file;
  }
}
