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

export function getStoragePathFromUrl(bucket: SignedStorageBucket, value: string | null | undefined): string | null {
  if (!value) return null;
  if (isStoragePath(value)) return value;

  const publicMatch = value.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+?)(?:\?|$)`));
  return publicMatch ? decodeURIComponent(publicMatch[1]) : null;
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
  const imagePath = item.imagePath ?? getStoragePathFromUrl("clothing-images", item.imageUrl);
  const backImagePath = item.backImagePath ?? getStoragePathFromUrl("clothing-images", item.backImageUrl);
  const [imageUrl, backImageUrl] = await Promise.all([
    imagePath ? getSignedStorageUrl("clothing-images", imagePath, { fallbackUrl: item.imageUrl ?? null }) : Promise.resolve(item.imageUrl ?? null),
    backImagePath ? getSignedStorageUrl("clothing-images", backImagePath, { fallbackUrl: item.backImageUrl ?? null }) : Promise.resolve(item.backImageUrl ?? null),
  ]);

  return {
    ...item,
    imagePath: imagePath ?? undefined,
    backImagePath: backImagePath ?? undefined,
    imageUrl: imageUrl ?? "",
    backImageUrl: backImageUrl ?? undefined,
  };
}
