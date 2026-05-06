import { removeBackground } from "@imgly/background-removal";

export function preloadBgRemovalModel(): void {
  // Warm up the ONNX model with a 1×1 transparent PNG so the first real
  // removal is fast. An empty Blob fails before the model downloads; a valid
  // PNG image forces the full pipeline (fetch model → init ONNX session →
  // run inference) to complete and cache. Errors are silently swallowed.
  const px = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const bytes = Uint8Array.from(atob(px), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/png" });
  removeBackground(blob).catch(() => {});
}

export async function processClothingImage(file: File): Promise<Blob> {
  return removeBackground(file);
}
