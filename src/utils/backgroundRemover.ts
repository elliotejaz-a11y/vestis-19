import { removeBackground } from "@imgly/background-removal";

export async function removeImageBackground(
  image: File | Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const blob = await removeBackground(image, {
      output: { format: "image/png" },
      progress: (key: string, current: number, total: number) => {
        if (onProgress && total > 0) {
          onProgress(current / total);
        }
      },
    });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Background removal failed, returning original:", error);
    const fallbackBlob = image instanceof File ? image : image;
    return URL.createObjectURL(fallbackBlob);
  }
}
