import { removeBackground } from "@imgly/background-removal";

export function preloadBgRemovalModel(): void {
  // Warm up the ONNX model in the background so the first removal is faster.
  // Ignore errors — this is best-effort preloading.
  removeBackground(new Blob()).catch(() => {});
}

export async function processClothingImage(file: File): Promise<Blob> {
  return removeBackground(file);
}
