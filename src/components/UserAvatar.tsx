import { useState, useEffect, useRef } from "react";
import { batchResolveAvatarUrls, getCachedAvatarUrl, getAvatarDisplayUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// Head circle + rounded shoulder path — scales cleanly from 24px to 200px via viewBox
function Silhouette({ bg, figure }: { bg: string; figure: string }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="100" height="100" fill={bg} />
      <circle cx="50" cy="38" r="17" fill={figure} />
      <path d="M16 86 Q16 64 50 64 Q84 64 84 86 Z" fill={figure} />
    </svg>
  );
}

const PRESET_CONFIGS: Record<string, { bg: string; figure: string }> = {
  silhouette_grey: { bg: "#D8D8D8", figure: "#FFFFFF" },
};

export const DEFAULT_AVATAR_PRESET_ID = "silhouette_grey";

export const AVATAR_PRESET_LIST = [
  { id: DEFAULT_AVATAR_PRESET_ID, label: "Default" },
] as const;

export type AvatarPresetId = typeof AVATAR_PRESET_LIST[number]["id"];

export interface UserAvatarProps {
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  displayName?: string | null;
  email?: string | null;
  userId?: string | null;
  className?: string;
  avatarPosition?: string | null;
}

export function UserAvatar({
  avatarUrl,
  avatarPreset,
  displayName,
  email,
  userId,
  className,
  avatarPosition,
}: UserAvatarProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    getCachedAvatarUrl(avatarUrl) ?? avatarUrl ?? null
  );
  const [imgError, setImgError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // PERF: Try the transform URL (scaled WebP) first; fall back to original on error.
  const [useTransform, setUseTransform] = useState(true);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!avatarUrl) { setResolvedUrl(null); return; }
    let cancelled = false;
    batchResolveAvatarUrls([avatarUrl]).then(([signed]) => {
      if (!cancelled) setResolvedUrl(signed ?? avatarUrl);
    });
    return () => { cancelled = true; };
  }, [avatarUrl]);

  useEffect(() => {
    setImgError(false);
    setRetryKey(0);
    retryCount.current = 0;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    // PERF: Reset transform flag when the underlying URL changes so the fast path is retried.
    setUseTransform(true);
  }, [resolvedUrl]);

  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, []);

  const handleImgError = () => {
    // PERF: If the transform URL failed (e.g. plan doesn't have image transformations),
    // drop back to the original URL immediately — no delay, no retry counter consumed.
    if (useTransform && getAvatarDisplayUrl(resolvedUrl) !== resolvedUrl) {
      setUseTransform(false);
      return;
    }
    if (retryCount.current < MAX_RETRIES) {
      retryCount.current += 1;
      retryTimer.current = setTimeout(() => setRetryKey((k) => k + 1), RETRY_DELAY_MS);
    } else {
      setImgError(true);
    }
  };

  const showPhoto = !!resolvedUrl && !imgError;
  const presetCfg = !showPhoto
    ? (PRESET_CONFIGS[avatarPreset || DEFAULT_AVATAR_PRESET_ID] ?? PRESET_CONFIGS[DEFAULT_AVATAR_PRESET_ID])
    : null;
  // PERF: Use the transform URL (small WebP from CDN) when available; fall back to original.
  const displaySrc = showPhoto
    ? (useTransform ? (getAvatarDisplayUrl(resolvedUrl) ?? resolvedUrl!) : resolvedUrl!)
    : null;

  return (
    <div
      className={cn("rounded-full overflow-hidden flex-shrink-0 bg-muted", className)}
      style={{ containerType: "inline-size" }}
    >
      {showPhoto ? (
        <img
          key={`${retryKey}-${useTransform ? "t" : "o"}`}
          src={displaySrc!}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: avatarPosition || "center" }}
          loading="eager"
          fetchPriority="high"
          onError={handleImgError}
        />
      ) : presetCfg ? (
        <Silhouette bg={presetCfg.bg} figure={presetCfg.figure} />
      ) : (
        <Silhouette bg={PRESET_CONFIGS[DEFAULT_AVATAR_PRESET_ID].bg} figure={PRESET_CONFIGS[DEFAULT_AVATAR_PRESET_ID].figure} />
      )}
    </div>
  );
}
