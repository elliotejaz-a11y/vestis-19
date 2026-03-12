/**
 * Image processing utilities.
 * Client-side background removal has been removed — raw images are used as-is.
 */

/** No-op preload kept for backward compatibility with existing call sites. */
export function preloadBgRemovalModel(): void {
  // No-op: client-side bg removal removed
}

/** No-op: returns the original file unchanged. */
export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
