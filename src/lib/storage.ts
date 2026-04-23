import { supabase } from "@/integrations/supabase/client";

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
