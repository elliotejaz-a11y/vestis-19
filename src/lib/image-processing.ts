import { removeBackground } from "@imgly/background-removal";

/**
 * Remove the background from a clothing image using @imgly/background-removal.
 * Returns a clean PNG blob on success, or the original file as fallback.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  try {
    const result = await removeBackground(file, {
      output: { format: "image/png" },
    });
    return result;
  } catch (err) {
    console.warn("[processClothingImage] Background removal failed, returning original:", err);
    return file;
  }
}
