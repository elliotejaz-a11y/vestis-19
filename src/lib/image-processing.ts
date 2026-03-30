import { removeBackground, type Config } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT_MS = 60_000; // 1 minute max (faster timeout since we use small model)

/**
 * Shared config for @imgly/background-removal.
 * - model "small" is ~4× faster than "medium" with acceptable quality for wardrobe items.
 * - output as PNG to preserve transparency.
 * - progress callback for optional future UI hooks.
 */
const bgRemovalConfig: Config = {
  model: "isnet_quint8",
  output: {
    format: "image/png",
    quality: 0.9,
  },
  progress: () => {},
};

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
      // Create a tiny 1×1 transparent PNG to trigger model download & caching
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/png")
      );
      await removeBackground(blob, bgRemovalConfig);
      // Model preloaded & cached
    } catch {
      preloadPromise = null;
      preloadPromise = null; // allow retry
    }
  })();
}

/**
 * Remove the background from a clothing image using @imgly/background-removal.
 * Returns a clean PNG blob on success, or the original file as fallback.
 *
 * Performance optimisations applied:
 * 1. Uses "small" model (~4× faster, ~10MB vs ~44MB for medium).
 * 2. Model assets are preloaded & browser-cached after first use.
 * 3. Tighter 60s timeout since small model processes faster.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    // Starting background removal

    const removalPromise = removeBackground(file, bgRemovalConfig);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Background removal timed out")), BG_REMOVAL_TIMEOUT_MS)
    );

    const result = await Promise.race([removalPromise, timeoutPromise]);
    return result;
  } catch {
    return file;
    return file;
  }
}
