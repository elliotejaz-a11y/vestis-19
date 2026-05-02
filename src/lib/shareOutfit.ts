import { ClothingItem, Outfit } from "@/types/wardrobe";
import { batchResolveSignedClothingImageFields } from "@/lib/storage";
import logo from "@/assets/vestis-logo.png";

// ── Layout constants (mirror ShareOutfitCard) ─────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1350;
const CANVAS_SCALE = 3.35;

const CATEGORY_ORDER = [
  "hats", "accessories", "outerwear", "jumpers", "tops", "dresses", "bottoms", "shoes",
];

const BASE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; z: number }> = {
  hats:        { x: 56, y: 16, w: 64,  h: 64,  z: 50 },
  accessories: { x: 78, y: 42, w: 58,  h: 58,  z: 45 },
  outerwear:   { x: 36, y: 34, w: 130, h: 130, z: 30 },
  jumpers:     { x: 36, y: 34, w: 130, h: 130, z: 29 },
  tops:        { x: 52, y: 36, w: 112, h: 112, z: 35 },
  dresses:     { x: 50, y: 52, w: 118, h: 146, z: 26 },
  bottoms:     { x: 50, y: 70, w: 122, h: 148, z: 24 },
  shoes:       { x: 72, y: 88, w: 80,  h: 80,  z: 25 },
};

const SPREAD = [-8, 0, 8, -14, 14];

// ── Image helpers ─────────────────────────────────────────────────────────────

/**
 * Convert any URL to a data: URL so canvas.drawImage() can use it without
 * tainting the canvas. Falls back through two strategies before giving up.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    // cache:"reload" forces a fresh CORS-enabled server round-trip, bypassing
    // any non-CORS cached copy stored by a plain <img> load earlier.
    const res = await fetch(url, { mode: "cors", cache: "reload" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch (fetchErr) {
    try {
      return await imgElementToDataUrl(url);
    } catch {
      console.warn("[shareOutfit] failed to inline image", url, fetchErr);
      return url;
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function imgElementToDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 1;
        c.height = img.naturalHeight || 1;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("img load failed"));
    img.src = src;
  });
}

/** Load a URL (ideally a data: URL) into an HTMLImageElement. */
function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Item preparation ──────────────────────────────────────────────────────────

export async function inlineItemImages<T extends { imageUrl: string }>(items: T[]): Promise<T[]> {
  const resolved = await Promise.all(items.map((i) => urlToDataUrl(i.imageUrl)));
  return items.map((i, idx) => ({ ...i, imageUrl: resolved[idx] }));
}

export async function prepareShareItems(items: ClothingItem[]): Promise<ClothingItem[]> {
  const resolvedItems = await batchResolveSignedClothingImageFields(items);
  return inlineItemImages(resolvedItems);
}

// ── Canvas card ───────────────────────────────────────────────────────────────

/**
 * Draw a Vestis outfit share card directly onto a Canvas 2D context and return
 * it as a PNG blob. This bypasses html-to-image / SVG-foreignObject entirely,
 * which is the only reliable approach on iOS Safari.
 */
export async function drawOutfitCardToBlob(opts: {
  items: ClothingItem[];
  username?: string | null;
  occasion?: string;
}): Promise<Blob> {
  const { items, username, occasion } = opts;

  // Resolve signed URLs and convert to data: URLs so drawImage never taints
  const [preparedItems, logoDataUrl] = await Promise.all([
    prepareShareItems(items),
    urlToDataUrl(logo as string),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#F5F0EB";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  let curY = 60;

  // Logo
  const logoImg = await loadImg(logoDataUrl);
  if (logoImg) {
    const logoH = 70;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    ctx.drawImage(logoImg, (CARD_W - logoW) / 2, curY, logoW, logoH);
    curY += logoH + 10;
  }

  // Username
  if (username) {
    ctx.font = "600 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#8B1A2F";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`@${username}`, CARD_W / 2, curY);
    curY += 44;
  }

  // Outfit canvas
  const OUTFIT_SIZE = 980;
  const OUTFIT_LEFT = (CARD_W - OUTFIT_SIZE) / 2;
  const OUTFIT_TOP = curY + 18;

  // Sort by category order
  const sorted = [...preparedItems].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf((a.category || "").toLowerCase());
    const bi = CATEGORY_ORDER.indexOf((b.category || "").toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Pre-calculate positions
  const countByCategory: Record<string, number> = {};
  const itemDefs = sorted.map((item, i) => {
    const category = (item.category || "").toLowerCase();
    const base = BASE_LAYOUT[category] ?? {
      x: 20 + (i % 4) * 18,
      y: 20 + Math.floor(i / 4) * 22,
      w: 80, h: 80, z: 10,
    };
    const catIndex = countByCategory[category] ?? 0;
    countByCategory[category] = catIndex + 1;

    const spread = SPREAD[catIndex % SPREAD.length];
    const px = base.x + spread;
    const py = base.y + (catIndex > 0 ? 4 : 0);
    const scale = catIndex > 0 ? 0.9 : 1;
    const dw = base.w * scale * CANVAS_SCALE;
    const dh = base.h * scale * CANVAS_SCALE;
    const dx = OUTFIT_LEFT + (px / 100) * OUTFIT_SIZE - dw / 2;
    const dy = OUTFIT_TOP + (py / 100) * OUTFIT_SIZE - dh / 2;

    return { imageUrl: item.imageUrl, dx, dy, dw, dh, z: base.z + catIndex };
  });

  // Load all item images in parallel
  type DrawItem = { img: HTMLImageElement; dx: number; dy: number; dw: number; dh: number; z: number };
  const loaded = await Promise.all(
    itemDefs.map(async ({ imageUrl, dx, dy, dw, dh, z }) => {
      const img = await loadImg(imageUrl);
      return img ? ({ img, dx, dy, dw, dh, z } satisfies DrawItem) : null;
    }),
  );
  const drawItems = loaded.filter((x): x is DrawItem => x !== null);

  // Draw lowest z-index first
  drawItems.sort((a, b) => a.z - b.z);
  for (const { img, dx, dy, dw, dh } of drawItems) {
    ctx.save();
    ctx.shadowColor = "rgba(43, 20, 24, 0.14)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // Footer — pinned to the bottom (mirrors marginTop:"auto" in ShareOutfitCard)
  const BOTTOM_PAD = 60;
  const GAP = 8;

  // Tagline
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#8B1A2F";
  ctx.textBaseline = "alphabetic";
  let footerBottom = CARD_H - BOTTOM_PAD;
  drawSpacedText(ctx, "VESTISAPP.ONLINE", CARD_W / 2, footerBottom, 3.6);
  footerBottom -= GAP + 4; // 4px matches marginBottom on separator

  // Separator
  footerBottom -= 2;
  ctx.fillStyle = "rgba(139, 26, 47, 0.6)";
  ctx.fillRect((CARD_W - 60) / 2, footerBottom, 60, 2);
  footerBottom -= GAP;

  // Occasion
  if (occasion) {
    ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(42, 20, 24, 0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(occasion, CARD_W / 2, footerBottom);
  }

  return canvasToBlob(canvas);
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacing: number,
): void {
  ctx.textAlign = "left";
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
  let x = centerX - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + spacing;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // iOS Safari fallback: toDataURL → fetch → blob
        try {
          const dataUrl = canvas.toDataURL("image/png");
          fetch(dataUrl).then((r) => r.blob()).then(resolve).catch(reject);
        } catch (e) {
          reject(e);
        }
      },
      "image/png",
    );
  });
}

// ── Share trigger ─────────────────────────────────────────────────────────────

export async function nativeShareOrFallback(opts: {
  pngBlob: Blob;
  title?: string;
  text?: string;
}): Promise<"shared" | "downloaded"> {
  const {
    pngBlob,
    title = "My Vestis Outfit",
    text = "Check out this outfit I made on Vestis",
  } = opts;
  const file = new File([pngBlob], "vestis-outfit.png", { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  try {
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title, text });
      return "shared";
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "shared";
  }

  const objectUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "vestis-outfit.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return "downloaded";
}

export type ShareableOutfit = Pick<Outfit, "name" | "occasion"> & {
  items: ClothingItem[];
};
