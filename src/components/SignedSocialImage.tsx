import { useEffect, useState, memo } from "react";
import { getSignedSocialUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

// Module-level cache: avoids re-signing the same URL on remount or re-render
const cache = new Map<string, { resolved: string; expiresAt: number }>();
const CACHE_TTL_MS = 55 * 60 * 1000;

function getCached(src: string): string | null {
  const entry = cache.get(src);
  if (entry && entry.expiresAt - Date.now() > 60_000) return entry.resolved;
  return null;
}

function isFastPath(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false;
  // Legacy public URL — no social-content signing needed
  if (!src.includes("/social-content/")) return true;
  // Already signed by a previous batch signing call
  if (src.includes("token=")) return true;
  return false;
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
}

export const SignedSocialImage = memo(function SignedSocialImage({ src, className, ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(() => {
    if (!src) return null;
    if (isFastPath(src)) return src;
    return getCached(src);
  });
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);

    if (!src) {
      setResolved(null);
      return;
    }

    if (isFastPath(src)) {
      setResolved(src);
      return;
    }

    const cached = getCached(src);
    if (cached) {
      setResolved(cached);
      return;
    }

    setResolved(null);
    getSignedSocialUrl(src)
      .then((u) => {
        if (!cancelled && u) {
          cache.set(src, { resolved: u, expiresAt: Date.now() + CACHE_TTL_MS });
          setResolved(u);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [src]);

  if (!resolved || errored) return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  return <img {...rest} className={className} src={resolved} onError={() => setErrored(true)} />;
});
