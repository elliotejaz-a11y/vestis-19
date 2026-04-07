/**
 * Image processing utilities — no external background removal library.
 * The image is returned as-is (original file).
 */

/** No-op preload — kept for API compatibility. */
export function preloadBgRemovalModel(): void {
  // No external model to preload
}

/**
 * Returns the original file as a Blob (no background removal).
 */
export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
