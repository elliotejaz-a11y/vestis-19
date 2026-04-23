/**
 * Client-side background removal is disabled (the @imgly/background-removal
 * library was removed because its WASM/ONNX bundle broke production builds).
 *
 * These functions are kept as no-op shims so callers don't need to change.
 * Background removal, if needed, is handled server-side.
 */

export function preloadBgRemovalModel(): void {
  // no-op
}

export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
