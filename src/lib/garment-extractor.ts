import { removeBackground } from "@imgly/background-removal";

const MAX_OUTPUT_PX = 1024;
// Extra padding (fractional) added on each side of the detected bbox before cropping,
// so we don't clip garment edges when the model's bbox is tight.
const BBOX_PADDING = 0.08;

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops the garment region from a JPEG base64 source image, removes the
 * background, composites the result on a white canvas, and returns a PNG
 * blob ready for wardrobe storage (max 1024×1024 px).
 *
 * Falls back at each step rather than throwing:
 *   - Background removal failure  → crop on white background
 *   - Any other failure           → caller should use raw source image
 */
export async function extractGarmentImage(
  sourceBase64: string,
  bbox?: BBox,
): Promise<Blob> {
  const img = await decodeBase64Image(sourceBase64);
  const croppedBlob = await cropToGarment(img, bbox);

  let foreground: Blob;
  try {
    foreground = await removeBackground(croppedBlob);
  } catch {
    // Background removal failed — composite the raw crop on white instead
    foreground = croppedBlob;
  }

  return compositeOnWhite(foreground, MAX_OUTPUT_PX);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function decodeBase64Image(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

async function cropToGarment(img: HTMLImageElement, bbox?: BBox): Promise<Blob> {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Default: use full image if no bbox provided
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (bbox) {
    const pad = BBOX_PADDING;
    sx = Math.max(0, bbox.x - pad) * iw;
    sy = Math.max(0, bbox.y - pad) * ih;
    const ex = Math.min(1, bbox.x + bbox.width + pad) * iw;
    const ey = Math.min(1, bbox.y + bbox.height + pad) * ih;
    sw = Math.max(1, ex - sx);
    sh = Math.max(1, ey - sy);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

async function compositeOnWhite(blob: Blob, maxPx: number): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return canvasToBlob(canvas, "image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      type,
      quality,
    );
  });
}
