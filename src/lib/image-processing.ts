/**
 * Image processing utilities for wardrobe items.
 * Background removal is handled server-side — this module provides
 * a passthrough so existing call-sites continue to work.
 */

/** No-op preload — kept for API compatibility. */
export function preloadBgRemovalModel(): void {
  // intentional no-op
}

/**
 * Process a clothing image before upload.
 * Returns the original file as-is (background removal is handled elsewhere).
 */
export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
