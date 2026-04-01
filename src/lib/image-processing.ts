/**
 * Image processing utilities for wardrobe items.
 * Background removal is handled server-side; this module provides
 * client-side stubs so existing call-sites continue to work.
 */

/** No-op preload – background removal now happens server-side. */
export function preloadBgRemovalModel(): void {
  // intentionally empty
}

/**
 * Returns the original file as-is.
 * Background removal is handled server-side after upload.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
