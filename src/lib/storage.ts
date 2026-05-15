import { supabase } from "@/integrations/supabase/client";

type ImageFields = {
  imageUrl?: string | null;
  imagePath?: string | null;
  backImageUrl?: string | null;
  backImagePath?: string | null;
};

type SignedStorageBucket = "clothing-images" | "wishlist-images" | "social-content" | "social-media";

// Only extract paths from URLs belonging to this project — prevents generating
// signed URLs on the current project for files that live in a different Supabase
// project (e.g. migrated data whose image_url still points at the old instance).
const CURRENT_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

// Module-level cache: raw path/URL → { signedUrl, expiresAt }
const avatarUrlCache = new Map<string, { signedUrl: string; expiresAt: number }>();

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

// Returns a cached signed avatar URL synchronously, or null if not cached / expired.
export function getCachedAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cached = avatarUrlCache.get(url);
  if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) return cached.signedUrl;
  return null;
}

// Resolves avatar URLs and kicks off browser image prefetch so subsequent <img> renders
// hit the browser cache. Prefetches the transform URL (not the raw URL) so the cache
// hit lands on the same small WebP that UserAvatar renders.
export async function preloadAvatarUrls(urls: (string | null | undefined)[]): Promise<void> {
  const filtered = urls.filter(Boolean) as string[];
  if (filtered.length === 0) return;
  const resolved = await batchResolveAvatarUrls(filtered);
  resolved.forEach((url) => {
    if (url) {
      const img = new Image();
      // PERF: Prefetch the transform URL so the browser cache hit matches what UserAvatar renders.
      img.src = getAvatarDisplayUrl(url) ?? url;
    }
  });
}

export async function preloadAllProfileAvatarUrls(): Promise<void> {
  const pageSize = 500;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .not("avatar_url", "is", null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("Avatar preload failed:", error);
      return;
    }

    const urls = (data || []).map((profile) => profile.avatar_url);
    await preloadAvatarUrls(urls);

    if (!data || data.length < pageSize) return;
    from += pageSize;
  }
}

// Signs avatar URLs from either social-content (new uploads) or social-media (legacy) buckets.
// Falls back to the original URL if signing fails so there's never a regression.
export async function batchResolveAvatarUrls(avatarUrls: (string | null | undefined)[]): Promise<(string | null)[]> {
  if (avatarUrls.length === 0) return [];

  const now = Date.now();
  type Entry = { index: number; passthrough: string } | { index: number; path: string; bucket: SignedStorageBucket };
  const entries: Entry[] = [];
  const contentPaths: string[] = [];
  const clothingPaths: string[] = [];

  avatarUrls.forEach((url, index) => {
    if (!url) { entries.push({ index, passthrough: "" }); return; }

    // Return cached signed URL if still valid (with 5-min buffer)
    const cached = avatarUrlCache.get(url);
    if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
      entries.push({ index, passthrough: cached.signedUrl });
      return;
    }

    if (isStoragePath(url)) {
      contentPaths.push(url);
      entries.push({ index, path: url, bucket: "social-content" });
      return;
    }
    if (url.includes("/social-content/")) {
      const path = getStoragePathFromUrl("social-content", url);
      if (path) { contentPaths.push(path); entries.push({ index, path, bucket: "social-content" }); return; }
    }
    // PERF: social-media is a permanently public bucket (public=true across all migrations).
    // Public URLs are permanent CDN URLs that need no signing — return as passthrough to
    // eliminate the unnecessary Supabase round-trip and prevent a mid-download URL switch
    // that causes the browser to restart the image download after signing completes.
    if (url.includes("/social-media/")) {
      entries.push({ index, passthrough: url });
      return;
    }
    if (url.includes("/clothing-images/")) {
      const path = getStoragePathFromUrl("clothing-images", url);
      if (path) { clothingPaths.push(path); entries.push({ index, path, bucket: "clothing-images" }); return; }
    }
    entries.push({ index, passthrough: url });
  });

  const signedMap = new Map<string, string>();
  const expiresAt = now + SIGNED_URL_EXPIRES_IN_SECONDS * 1000;

  if (contentPaths.length > 0) {
    const { data } = await supabase.storage.from("social-content")
      .createSignedUrls([...new Set(contentPaths)], SIGNED_URL_EXPIRES_IN_SECONDS);
    (data || []).filter((d) => d.signedUrl).forEach((d) => signedMap.set(`c:${d.path}`, d.signedUrl!));
  }
  // social-media paths are returned as passthrough above and never reach here.
  if (clothingPaths.length > 0) {
    const { data } = await supabase.storage.from("clothing-images")
      .createSignedUrls([...new Set(clothingPaths)], SIGNED_URL_EXPIRES_IN_SECONDS);
    (data || []).filter((d) => d.signedUrl).forEach((d) => signedMap.set(`cl:${d.path}`, d.signedUrl!));
  }

  return avatarUrls.map((url, i) => {
    if (!url) return null;
    const entry = entries[i];
    if (!entry) return url;
    if ("passthrough" in entry) return entry.passthrough || url;
    const key = entry.bucket === "social-content" ? `c:${entry.path}` : `cl:${entry.path}`;
    const signed = signedMap.get(key) ?? url;
    if (signed !== url) avatarUrlCache.set(url, { signedUrl: signed, expiresAt });
    return signed;
  });
}

// PERF: Converts a Supabase Storage public URL to an image-transformation URL that serves
// a scaled WebP (~20–50 KB) instead of the full-resolution upload (potentially 1–3 MB).
// Only applies to /object/public/ URLs (social-media avatars); signed URLs and other
// formats are returned unchanged. Falls back gracefully if the transformation API is
// unavailable (caller checks onError and retries with the original URL).
export function getAvatarDisplayUrl(url: string | null | undefined, sizePx = 300): string | null {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const base = url.split("?")[0];
  return (
    base.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
    `?width=${sizePx}&height=${sizePx}&resize=contain&quality=80`
  );
}
