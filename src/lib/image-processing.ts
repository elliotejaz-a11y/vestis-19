export function preloadBgRemovalModel(): void {
  // Background removal is handled outside the client bundle.
}

export async function processClothingImage(file: File): Promise<Blob> {
  return file;
}
