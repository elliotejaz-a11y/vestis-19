import { supabase } from "@/integrations/supabase/client";

type ImageFields = {
  imageUrl?: string | null;
  imagePath?: string | null;
  backImageUrl?: string | null;
  backImagePath?: string | null;
};

type SignedStorageBucket = "clothing-images" | "wishlist-images" | "social-content";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

export const SOCIAL_CONTENT_BUCKET = "social-content" as const;

export async function getSignedSocialUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  // Legacy public URLs from old "social-media" bucket — return as-is (avatars, old posts).
  if (/^https?:\/\//i.test(value) && !value.includes("/social-content/")) return value;
  const path = getStoragePathFromUrl("social-content", value) ?? (isStoragePath(value) ? value : null);
  if (!path) return value;
  return getSignedStorageUrl("social-content", path, { fallbackUrl: value });
}

export async function getSignedSocialUrls(values: (string | null | undefined)[]): Promise<string[]> {
  const results = await Promise.all(values.map((v) => getSignedSocialUrl(v)));
  return results.filter((v): v is string => Boolean(v));
}

export function isStoragePath(value: string | null | undefined): boolean {
  return Boolean(value) && !/^https?:\/\//i.test(value as string) && !value!.startsWith("blob:") && !value!.startsWith("data:");
}

export function getStoragePathFromUrl(bucket: SignedStorageBucket, value: string | null | undefined): string | null {
  if (!value) return null;
  if (isStoragePath(value)) return value;

  const publicMatch = value.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+?)(?:\\?|$)`));
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

// Batches all clothing image paths into a single createSignedUrls call instead of one per item.
export async function batchResolveSignedClothingImageFields<T extends ImageFields>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;

  const itemPaths = items.map((item) => ({
    imagePath: item.imagePath ?? getStoragePathFromUrl("clothing-images", item.imageUrl),
    backImagePath: item.backImagePath ?? getStoragePathFromUrl("clothing-images", item.backImageUrl),
  }));

  const uniquePaths = [...new Set(
    itemPaths.flatMap((p) => [p.imagePath, p.backImagePath]).filter(Boolean) as string[]
  )];

  if (uniquePaths.length === 0) return items;

  const { data } = await supabase.storage
    .from("clothing-images")
    .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRES_IN_SECONDS);

  const signedMap = new Map<string, string>(
    (data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl!])
  );

  return items.map((item, i) => {
    const { imagePath, backImagePath } = itemPaths[i];
    return {
      ...item,
      imagePath: imagePath ?? undefined,
      backImagePath: backImagePath ?? undefined,
      imageUrl: (imagePath ? signedMap.get(imagePath) : null) ?? item.imageUrl ?? "",
      backImageUrl: (backImagePath ? signedMap.get(backImagePath) : null) ?? item.backImageUrl ?? undefined,
    };
  });
}

// Batches social image URL signing — all paths in one createSignedUrls call.
export async function batchGetSignedSocialUrls(values: (string | null | undefined)[]): Promise<(string | null)[]> {
  if (values.length === 0) return [];

  type Entry = { index: number; path: string } | { index: number; passthrough: string };
  const entries: Entry[] = [];
  const pathsToSign: string[] = [];

  values.forEach((value, index) => {
    if (!value) { entries.push({ index, passthrough: "" }); return; }
    if (/^https?:\/\//i.test(value) && !value.includes("/social-content/")) {
      entries.push({ index, passthrough: value });
      return;
    }
    const path = getStoragePathFromUrl("social-content", value) ?? (isStoragePath(value) ? value : null);
    if (!path) { entries.push({ index, passthrough: value }); return; }
    pathsToSign.push(path);
    entries.push({ index, path });
  });

  const signedMap = new Map<string, string>();
  if (pathsToSign.length > 0) {
    const { data } = await supabase.storage
      .from("social-content")
      .createSignedUrls([...new Set(pathsToSign)], SIGNED_URL_EXPIRES_IN_SECONDS);
    (data || []).filter((d) => d.signedUrl).forEach((d) => signedMap.set(d.path, d.signedUrl!));
  }

  return entries.map((entry) => {
    if ("passthrough" in entry) return entry.passthrough || null;
    return signedMap.get(entry.path) ?? values[entry.index] ?? null;
  });
}
