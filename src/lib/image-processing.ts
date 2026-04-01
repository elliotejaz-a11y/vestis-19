/**
 * Image processing utilities.
 * Background removal is handled server-side — these are client-side stubs.
 */

/** No-op preload — background removal is handled server-side. */
export function preloadBgRemovalModel(): void {
  // No client-side model to preload
}

/**
 * Process a clothing image. Returns the original file as-is since
 * background removal is handled server-side.
 */
export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
