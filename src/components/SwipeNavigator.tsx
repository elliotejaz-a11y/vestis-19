import { useRef, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_PATHS = ["/", "/calendar", "/outfits", "/chat", "/profile"];
const SWIPE_THRESHOLD = 0.4; // 40% of screen width

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const directionLocked = useRef(false);
  const [offsetX, setOffsetX] = useState(0);

  const currentIndex = TAB_PATHS.indexOf(location.pathname);
  const isTabRoute = currentIndex !== -1;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTabRoute) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    directionLocked.current = false;
  }, [isTabRoute]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTabRoute) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (!directionLocked.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        directionLocked.current = true;
        isSwiping.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isSwiping.current) return;

    // Prevent swiping past bounds
    if (dx > 0 && currentIndex === 0) {
      setOffsetX(dx * 0.2); // rubber-band
      return;
    }
    if (dx < 0 && currentIndex === TAB_PATHS.length - 1) {
      setOffsetX(dx * 0.2);
      return;
    }

    setOffsetX(dx);
  }, [isTabRoute, currentIndex]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current || !isTabRoute) {
      setOffsetX(0);
      return;
    }

    const width = containerRef.current?.offsetWidth || window.innerWidth;
    const ratio = Math.abs(offsetX) / width;

    if (ratio > SWIPE_THRESHOLD) {
      const nextIndex = offsetX > 0
        ? Math.max(0, currentIndex - 1)
        : Math.min(TAB_PATHS.length - 1, currentIndex + 1);

      if (nextIndex !== currentIndex) {
        navigate(TAB_PATHS[nextIndex]);
      }
    }

    setOffsetX(0);
    isSwiping.current = false;
    directionLocked.current = false;
  }, [isTabRoute, offsetX, currentIndex, navigate]);

  // Reset offset on route change
  useEffect(() => { setOffsetX(0); }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full"
      style={{
        transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
        transition: isSwiping.current ? "none" : "transform 0.25s ease-out",
        willChange: offsetX !== 0 ? "transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}
