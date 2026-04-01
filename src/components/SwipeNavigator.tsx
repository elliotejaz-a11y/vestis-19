import { useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ORDER = ["/", "/calendar", "/outfits", "/wishlist", "/chat", "/profile"];
const SWIPE_THRESHOLD = 60;

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const currentIndex = TAB_ORDER.indexOf(location.pathname);

  // Disable swipe on routes with their own gesture handling (e.g. outfit builder)
  const SWIPE_DISABLED_ROUTES = ["/builder"];
  const swipeDisabled = SWIPE_DISABLED_ROUTES.includes(location.pathname);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (swipeDisabled) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiped.current = false;
  }, [swipeDisabled]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipeDisabled) return;
      if (!touchStart.current || swiped.current || currentIndex === -1) return;

      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;

      // Only act on horizontal swipes
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (dx < -SWIPE_THRESHOLD && currentIndex < TAB_ORDER.length - 1) {
        swiped.current = true;
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (dx > SWIPE_THRESHOLD && currentIndex > 0) {
        swiped.current = true;
        navigate(TAB_ORDER[currentIndex - 1]);
      }
    },
    [currentIndex, navigate]
  );

  const onTouchEnd = useCallback(() => {
    touchStart.current = null;
  }, []);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ minHeight: "100%" }}
    >
      {children}
    </div>
  );
}
