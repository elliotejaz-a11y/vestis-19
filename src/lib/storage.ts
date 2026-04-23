import { supabase } from "@/integrations/supabase/client";

type ImageFields = {
  imageUrl?: string | null;
  imagePath?: string | null;
  backImageUrl?: string | null;
  backImagePath?: string | null;
};

type SignedStorageBucket = "clothing-images" | "wishlist-images";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

export function isStoragePath(value: string | null | undefined): value is string {
  return Boolean(value) && !/^https?:\/\//i.test(value as string) && !value!.startsWith("blob:") && !value!.startsWith("data:");
}

export async function getSignedStorageUrl(
  bucket: SignedStorageBucket,
  path: string | null | undefined,
  options?: { fallbackUrl?: string | null }
): Promise<string | null> {
  if (!path) return options?.fallbackUrl ?? null;
  if (!isStoragePath(path)) return path;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);
  if (error || !data?.signedUrl) {
    console.warn(`Failed to create signed URL for ${bucket}/${path}:`, error);
    return options?.fallbackUrl ?? null;
  }

  return data.signedUrl;
}

export async function resolveSignedClothingImageFields<T extends ImageFields>(item: T): Promise<T> {
  const [imageUrl, backImageUrl] = await Promise.all([
    item.imagePath ? getSignedStorageUrl("clothing-images", item.imagePath, { fallbackUrl: item.imageUrl ?? null }) : Promise.resolve(item.imageUrl ?? null),
    item.backImagePath ? getSignedStorageUrl("clothing-images", item.backImagePath, { fallbackUrl: item.backImageUrl ?? null }) : Promise.resolve(item.backImageUrl ?? null),
  ]);

  return {
    ...item,
    imageUrl: imageUrl ?? "",
    backImageUrl: backImageUrl ?? undefined,
  };
}
