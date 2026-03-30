import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export function LazyImage({ src, alt, className, fallbackClassName, ...props }: LazyImageProps) {
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
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", fallbackClassName)}>
      {inView ? (
        <img
          src={src}
          alt={alt}
          className={cn(className, !loaded && "opacity-0")}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          {...props}
        />
      ) : null}
      {!loaded && (
        <div className={cn("absolute inset-0 animate-pulse rounded-lg bg-muted", fallbackClassName)} />
      )}
    </div>
  );
}
