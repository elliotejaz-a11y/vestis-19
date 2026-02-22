import { removeBackground } from "@imgly/background-removal";

const BG_REMOVAL_TIMEOUT_MS = 120000; // 2 minutes max

/**
 * Remove the background from a clothing image using @imgly/background-removal.
 * Returns a clean PNG blob on success, or the original file as fallback.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    console.log("[processClothingImage] Starting background removal...");
    const removalPromise = removeBackground(file, {
      output: { format: "image/png" },
    });
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
