import { removeBackground, type Config } from "@imgly/background-removal";

export interface RemoveBackgroundOptions {
  onProgress?: (phase: string, percent: number) => void;
}

/**
 * Remove the background from an image file/blob client-side.
 * Returns a Blob URL of the processed PNG image.
 */
export async function removeImageBackground(
  input: File | Blob,
  options?: RemoveBackgroundOptions
): Promise<string> {
  const config: Config = {
    output: {
      format: "image/png",
      quality: 0.9,
    },
    progress: (key, current, total) => {
      if (total > 0 && options?.onProgress) {
        options.onProgress(key, Math.round((current / total) * 100));
      }
    },
  };

  const resultBlob = await removeBackground(input, config);
  return URL.createObjectURL(resultBlob);
}