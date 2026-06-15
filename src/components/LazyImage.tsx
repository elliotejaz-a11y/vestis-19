import { useState, useRef, useEffect, memo } from "react";
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

export const LazyImage = memo(function LazyImage({ src, alt, className, fallbackClassName, displayWidth = 1200, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [errored, setErrored] = useState(false);
  const [useTransform, setUseTransform] = useState(true);
  const thumbnailSrc = getTransformUrl(src, 20, 20);
  const displaySrc = getTransformUrl(src, displayWidth, 80);
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
      { rootMargin: "400px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setUseTransform(true);
  }, [src]);

  const activeSrc = useTransform && displaySrc ? displaySrc : src;

  const handleError = () => {
    if (useTransform && displaySrc && displaySrc !== src) {
      setUseTransform(false);
    } else {
      setErrored(true);
    }
  };

  return (
    <div ref={ref} className={cn("relative overflow-hidden", fallbackClassName)}>
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
          src={activeSrc}
          alt={alt}
          className={cn(
            className,
            "transition-opacity duration-150 ease-out",
            loaded ? "opacity-100" : "opacity-0"
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
