import { removeBackground, type Config } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT_MS = 60_000; // 1 minute max

/**
 * Shared config for @imgly/background-removal.
 * - isnet_quint8: quantised model — fastest option with good quality.
 * - device "gpu": uses WebGPU when available, falls back to CPU/WASM.
 * - output as PNG to preserve transparency.
 */
const bgRemovalConfig: Config = {
  model: "isnet_quint8",
  device: "gpu",
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
 * Pre-scale an image so its longest edge is ≤ maxDim pixels.
 * This dramatically reduces the pixel count the ONNX model must process.
 */
export function preScaleImage(file: File, maxDim = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      // Already small enough → pass through
      if (w <= maxDim && h <= maxDim) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }
      const scale = maxDim / Math.max(w, h);
      const nw = Math.round(w * scale);
      const nh = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, nw, nh);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(img.src);
          b ? resolve(b) : reject(new Error("preScaleImage toBlob failed"));
        },
        "image/png"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file); // fallback to original
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Remove the background from a clothing image.
 *
 * Performance optimisations:
 * 1. Pre-scales to 800px max before processing (fewer pixels).
 * 2. Uses quantised model (isnet_quint8) for speed.
 * 3. Prefers GPU via WebGPU when available.
 * 4. Model assets preloaded & browser-cached on app startup.
 * 5. 60s timeout with graceful fallback.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    console.log("[processClothingImage] Pre-scaling image…");
    const scaled = await preScaleImage(file, 800);
    console.log("[processClothingImage] Starting background removal…");

    const removalPromise = removeBackground(scaled, bgRemovalConfig);
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
