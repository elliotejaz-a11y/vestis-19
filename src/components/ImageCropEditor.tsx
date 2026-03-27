import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ImageCropEditorProps {
  imageUrl: string;
  /** Aspect ratio of the crop area (width/height). Default 1 (square). */
  aspectRatio?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropEditor({
  imageUrl,
  aspectRatio = 1,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: string; h: string }>({ w: "100%", h: "100%" });

  // Recompute cover-fit dimensions whenever scale or image loads
  const updateImgSize = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = cW / cH;
    let w: number, h: number;
    if (imgAspect > containerAspect) {
      h = cH * scale;
      w = h * imgAspect;
    } else {
      w = cW * scale;
      h = w / imgAspect;
    }
    setImgSize({ w: `${w}px`, h: `${h}px` });
  }, [scale]);

  // Drag state
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Pinch state
  const lastPinchDist = useRef<number | null>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number) => {
      if (!containerRef.current || !imgRef.current) return { x: tx, y: ty };
      const container = containerRef.current.getBoundingClientRect();
      const imgNatW = imgRef.current.naturalWidth;
      const imgNatH = imgRef.current.naturalHeight;
      if (!imgNatW || !imgNatH) return { x: tx, y: ty };

      // The image is rendered to cover the container at scale=1
      // Compute rendered image size at current scale
      const containerW = container.width;
      const containerH = container.height;
      const imgAspect = imgNatW / imgNatH;
      const containerAspect = containerW / containerH;

      let renderedW: number, renderedH: number;
      if (imgAspect > containerAspect) {
        // Image is wider — height fills container
        renderedH = containerH * s;
        renderedW = renderedH * imgAspect;
      } else {
        // Image is taller — width fills container
        renderedW = containerW * s;
        renderedH = renderedW / imgAspect;
      }

      const maxTx = Math.max(0, (renderedW - containerW) / 2);
      const maxTy = Math.max(0, (renderedH - containerH) / 2);

      return {
        x: Math.max(-maxTx, Math.min(maxTx, tx)),
        y: Math.max(-maxTy, Math.min(maxTy, ty)),
      };
    },
    []
  );

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev - e.deltaY * 0.002));
        setTranslate((t) => clampTranslate(t.x, t.y, next));
        return next;
      });
    },
    [clampTranslate]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pointer drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // handled by touch events
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setTranslate((prev) => clampTranslate(prev.x + dx, prev.y + dy, scale));
    },
    [scale, clampTranslate]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Touch drag + pinch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2) {
      dragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setTranslate((prev) => clampTranslate(prev.x + dx, prev.y + dy, scale));
      }
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / lastPinchDist.current;
        lastPinchDist.current = dist;
        setScale((prev) => {
          const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * ratio));
          setTranslate((t) => clampTranslate(t.x, t.y, next));
          return next;
        });
      }
    },
    [scale, clampTranslate]
  );

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    lastPinchDist.current = null;
  }, []);

  // Render cropped result to canvas and return blob
  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const containerRect = container.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = containerRect.height;
    const imgNatW = img.naturalWidth;
    const imgNatH = img.naturalHeight;
    const imgAspect = imgNatW / imgNatH;
    const containerAspect = containerW / containerH;

    // Compute base rendered size (object-cover at scale=1)
    let baseW: number, baseH: number;
    if (imgAspect > containerAspect) {
      baseH = containerH;
      baseW = baseH * imgAspect;
    } else {
      baseW = containerW;
      baseH = baseW / imgAspect;
    }

    const scaledW = baseW * scale;
    const scaledH = baseH * scale;

    // Image is centered + translated
    const imgLeft = (containerW - scaledW) / 2 + translate.x;
    const imgTop = (containerH - scaledH) / 2 + translate.y;

    // Map container viewport back to natural image coordinates
    const scaleToNat = imgNatW / scaledW;
    const srcX = (-imgLeft) * scaleToNat;
    const srcY = (-imgTop) * scaleToNat;
    const srcW = containerW * scaleToNat;
    const srcH = containerH * scaleToNat;

    const outputSize = Math.min(1200, Math.max(containerW, containerH) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize * aspectRatio;
    canvas.height = outputSize;
    if (aspectRatio >= 1) {
      canvas.width = outputSize;
      canvas.height = outputSize / aspectRatio;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9
    );
  }, [scale, translate, aspectRatio, onConfirm]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">Pinch, scroll, or drag to adjust</p>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-muted cursor-grab active:cursor-grabbing touch-none select-none"
        style={{
          width: "100%",
          maxWidth: "320px",
          aspectRatio: `${aspectRatio}`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop preview"
          className="absolute pointer-events-none"
          draggable={false}
          onLoad={updateImgSize}
          style={{
            width: imgSize.w,
            height: imgSize.h,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px))`,
          }}
        />
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px))`,
          }}
        />
      </div>
      <div className="flex gap-2 w-full max-w-[320px]">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl text-sm"
        >
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          className="flex-1 h-10 rounded-xl bg-accent text-accent-foreground text-sm"
        >
          <Check className="w-4 h-4 mr-1" /> Confirm
        </Button>
      </div>
    </div>
  );
}
