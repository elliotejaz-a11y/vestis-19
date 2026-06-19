import { useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

function getTransformUrl(src: string | undefined, width: number, quality: number): string | undefined {
  if (!src || !src.includes("/storage/v1/object/")) return undefined;
  try {
    const url = new URL(src);
    url.pathname = url.pathname.replace("/storage/v1/object/", "/storage/v1/render/image/");
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));
    return url.toString();
  } catch {
    return undefined;
  }
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  displayWidth?: number;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className,
  fallbackClassName,
  displayWidth = 1200,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [useTransform, setUseTransform] = useState(true);

  const thumbnailSrc = getTransformUrl(src, 20, 20);
  const displaySrc = getTransformUrl(src, displayWidth, 80);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setUseTransform(true);
  }, [src]);

  const activeSrc = useTransform && displaySrc ? displaySrc : src;

  const handleError = () => {
    if (useTransform && displaySrc && displaySrc !== src) {
      // Transform URL failed (plan limitation or network) — fall back to original
      setUseTransform(false);
    } else {
      setErrored(true);
    }
  };

  return (
    /* Wrapper + img both use absolute inset-0. h-full on iOS Safari does not reliably
       resolve when the parent's height comes from top/bottom constraints vs an explicit
       height value — using absolute inset-0 on the img bypasses that entirely. */
    <div className="absolute inset-0 overflow-hidden">
      {!loaded && (
        <div
          className={cn("absolute inset-0 bg-muted", !errored && "animate-pulse", fallbackClassName)}
          style={{
            backgroundImage: thumbnailSrc ? `url(${thumbnailSrc})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {!errored && (
        <img
          src={activeSrc}
          alt={alt}
          className={cn(
            "absolute inset-0",
            className,
            "transition-opacity duration-150 ease-out",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
});
