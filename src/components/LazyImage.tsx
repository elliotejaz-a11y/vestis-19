import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export const LazyImage = memo(function LazyImage({ src, alt, className, fallbackClassName, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
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

  // Reset loaded state when src changes
  useEffect(() => { setLoaded(false); }, [src]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", fallbackClassName)}>
      {/* Blur-up placeholder */}
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 bg-muted",
            "animate-pulse",
            fallbackClassName
          )}
          style={{
            backgroundImage: src ? `url(${src})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            "transition-opacity duration-150 ease-out",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
});
