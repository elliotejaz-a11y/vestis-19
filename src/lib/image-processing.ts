import { removeBackground } from "@imgly/background-removal";

export async function processClothingImage(file: File): Promise<Blob> {
  try {
    const blob = await removeBackground(file, {
      output: { type: "image/png" },
    });
    return blob;
  } catch (error) {
    console.error("Background removal failed, returning original file:", error);
    return file;
  }
}
