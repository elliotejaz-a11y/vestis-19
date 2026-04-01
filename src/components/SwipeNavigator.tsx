import { useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ORDER = ["/", "/calendar", "/outfits", "/chat", "/profile"];
const SWIPE_THRESHOLD = 60;

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100%" }}>
      {children}
    </div>
  );
}
