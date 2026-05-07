import { useState, useEffect, useRef } from "react";
import { batchResolveAvatarUrls, getCachedAvatarUrl, getAvatarDisplayUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

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
  silhouette_grey:  { bg: "#E8E4E0", figure: "#BFBAB5" },
  silhouette_rose:  { bg: "hsl(350,55%,31%)", figure: "rgba(255,255,255,0.85)" },
  silhouette_navy:  { bg: "hsl(236,65%,34%)", figure: "rgba(255,255,255,0.85)" },
  silhouette_amber: { bg: "hsl(38,45%,40%)",  figure: "rgba(255,255,255,0.85)" },
  silhouette_sage:  { bg: "hsl(160,35%,30%)", figure: "rgba(255,255,255,0.85)" },
};

export const AVATAR_PRESET_LIST = [
  { id: "silhouette_grey",  label: "Grey" },
  { id: "silhouette_rose",  label: "Rose" },
  { id: "silhouette_navy",  label: "Navy" },
  { id: "silhouette_amber", label: "Amber" },
  { id: "silhouette_sage",  label: "Sage" },
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

  const seed      = userId || displayName || email || "vestis";
  const showPhoto = !!resolvedUrl && !imgError;
  const presetCfg = !showPhoto && avatarPreset ? (PRESET_CONFIGS[avatarPreset] ?? null) : null;
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
        <img
          src={dicebearUrl(seed)}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
