import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

function getThumbnailUrl(src: string | undefined): string | undefined {
  if (!src || !src.includes("/storage/v1/object/")) return undefined;
  try {
    const url = new URL(src);
    url.pathname = url.pathname.replace("/storage/v1/object/", "/storage/v1/render/image/");
    url.searchParams.set("width", "20");
    url.searchParams.set("quality", "20");
    return url.toString();
  } catch {
    return undefined;
  }
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export const LazyImage = memo(function LazyImage({ src, alt, className, fallbackClassName, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [errored, setErrored] = useState(false);
  const thumbnailSrc = getThumbnailUrl(src);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Reset loaded/errored state when src changes
  useEffect(() => { setLoaded(false); setErrored(false); }, [src]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", fallbackClassName)}>
      {/* Blur-up placeholder / error state */}
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 bg-muted",
            !errored && "animate-pulse",
            fallbackClassName
          )}
          style={{
            backgroundImage: thumbnailSrc ? `url(${thumbnailSrc})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {inView && !errored && (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            "transition-opacity duration-150 ease-out",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
});
