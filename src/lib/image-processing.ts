import { removeBackground, type Config } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT_MS = 60_000;

const bgRemovalConfig: Config = {
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

/** Singleton warm-up promise so model assets are fetched once & cached. */
let preloadPromise: Promise<void> | null = null;

/**
 * Pre-download the ONNX model + WASM runtime in the background so the first
 * real removal call doesn't pay the full download cost.
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
 * Remove the background from a clothing image using @imgly/background-removal.
 * Returns a clean PNG blob on success, or the original file as fallback.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    console.log("[processClothingImage] Starting background removal…");
    console.log("[processClothingImage] File size:", (file.size / 1024).toFixed(1), "KB, type:", file.type);

    const removalPromise = removeBackground(file, bgRemovalConfig);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Background removal timed out after 60s")), BG_REMOVAL_TIMEOUT_MS)
    );

    const result = await Promise.race([removalPromise, timeoutPromise]);
    console.log("[processClothingImage] Background removal succeeded, result size:", (result.size / 1024).toFixed(1), "KB");
    return result;
  } catch (err) {
    console.error("[processClothingImage] Background removal failed:", err);
    return file;
  }
}