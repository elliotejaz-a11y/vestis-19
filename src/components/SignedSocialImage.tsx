import { useEffect, useState, memo } from "react";
import { getSignedSocialUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
}

/**
 * Renders an <img> for a value that may be either a legacy public URL or a
 * private "social-content" path/URL needing a signed URL.
 */
export const SignedSocialImage = memo(function SignedSocialImage({ src, className, ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    if (!src) {
      setResolved(null);
      return;
    }
    // Fast path: legacy URL with no social-content reference — use directly.
    if (typeof src === "string" && /^https?:\/\//i.test(src) && !src.includes("/social-content/")) {
      setResolved(src);
      return;
    }
    setResolved(null);
    getSignedSocialUrl(src)
      .then((u) => {
        if (!cancelled) setResolved(u);
      })
      .catch((err) => {
        console.warn("SignedSocialImage: failed to resolve URL:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolved || errored) return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  return <img {...rest} className={className} src={resolved} onError={() => setErrored(true)} />;
});
