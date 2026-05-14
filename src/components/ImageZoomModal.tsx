import { useRef, useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { SignedSocialImage } from "@/components/SignedSocialImage";

interface Props {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
  /** Pass true when src is a raw storage path that needs signing. Default: false (already-signed HTTPS URLs). */
  needsSigning?: boolean;
}

export function ImageZoomModal({ src, alt = "", open, onClose, needsSigning = false }: Props) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const stateRef = useRef({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef({ pinchDist: 0, lastX: 0, lastY: 0, startY: 0, lastTapTime: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      stateRef.current = { scale: 1, x: 0, y: 0 };
      setTransform({ scale: 1, x: 0, y: 0 });
    }
  }, [open]);

  const pinchDist = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const g = gestureRef.current;
    const s = stateRef.current;
    if (e.touches.length === 2) {
      g.pinchDist = pinchDist(e.touches);
      g.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      g.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else {
      const now = Date.now();
      if (now - g.lastTapTime < 300) {
        const newScale = s.scale > 1.2 ? 1 : 2.5;
        stateRef.current = { scale: newScale, x: 0, y: 0 };
        setTransform({ scale: newScale, x: 0, y: 0 });
        g.lastTapTime = 0;
      } else {
        g.lastTapTime = now;
      }
      g.lastX = e.touches[0].clientX;
      g.lastY = e.touches[0].clientY;
      g.startY = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const g = gestureRef.current;
    const s = stateRef.current;
    if (e.touches.length === 2) {
      const newDist = pinchDist(e.touches);
      const ratio = g.pinchDist > 0 ? newDist / g.pinchDist : 1;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const newScale = Math.min(5, Math.max(1, s.scale * ratio));
      stateRef.current = { scale: newScale, x: s.x + (mx - g.lastX), y: s.y + (my - g.lastY) };
      setTransform({ ...stateRef.current });
      g.pinchDist = newDist;
      g.lastX = mx;
      g.lastY = my;
    } else if (e.touches.length === 1) {
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      if (s.scale > 1) {
        stateRef.current = { ...s, x: s.x + (cx - g.lastX), y: s.y + (cy - g.lastY) };
        setTransform({ ...stateRef.current });
      } else if (cy - g.startY > 100) {
        onClose();
      }
      g.lastX = cx;
      g.lastY = cy;
    }
  }, [onClose]);

  const handleTouchEnd = useCallback(() => {
    const s = stateRef.current;
    if (s.scale < 1.05) {
      stateRef.current = { scale: 1, x: 0, y: 0 };
      setTransform({ scale: 1, x: 0, y: 0 });
    }
    gestureRef.current.pinchDist = 0;
  }, []);

  // Use native listeners so we can call preventDefault() on touchmove (passive: false required)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!open || !src) return null;

  const imageStyle: React.CSSProperties = {
    transform: `translateX(${transform.x}px) translateY(${transform.y}px) scale(${transform.scale})`,
    transition: "none",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {needsSigning ? (
          <SignedSocialImage
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            style={imageStyle}
            draggable={false}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            style={imageStyle}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
