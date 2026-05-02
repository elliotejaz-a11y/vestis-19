import { toPng } from "html-to-image";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { batchResolveSignedClothingImageFields } from "@/lib/storage";

/** Fetch an image URL and return a data: URL so html-to-image can embed it. */
export async function urlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    // cache:"reload" forces a fresh server round-trip, bypassing any non-CORS
    // cached copy that a prior <img> load may have stored without CORS headers.
    const res = await fetch(url, { mode: "cors", cache: "reload" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (fetchErr) {
    // Fallback: HTMLImageElement → offscreen canvas. Still needs CORS headers
    // from the server, but avoids the browser's fetch CORS-cache taint issue.
    try {
      return await canvasDataUrl(url);
    } catch {
      console.warn("[shareOutfit] failed to inline image", url, fetchErr);
      return url;
    }
  }
}

/** Convert a URL to a data: URL via an offscreen canvas. */
async function canvasDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("img load error"));
    img.src = src;
  });
}

/** Resolve all item.imageUrl values into data: URLs in parallel. */
export async function inlineItemImages<T extends { imageUrl: string }>(
  items: T[],
): Promise<T[]> {
  const resolved = await Promise.all(items.map((i) => urlToDataUrl(i.imageUrl)));
  return items.map((i, idx) => ({ ...i, imageUrl: resolved[idx] }));
}

/** Resolve clothing storage paths to signed URLs, then inline them for capture. */
export async function prepareShareItems(items: ClothingItem[]): Promise<ClothingItem[]> {
  const resolvedItems = await batchResolveSignedClothingImageFields(items);
  return inlineItemImages(resolvedItems);
}

/** Wait for all <img> inside a node to finish loading and decoding. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      // Ensure the browser has fully decoded the bitmap before we snapshot.
      try {
        await (img as HTMLImageElement & { decode?: () => Promise<void> }).decode?.();
      } catch {
        // decode() unsupported or already decoded — safe to ignore
      }
    }),
  );
}

/** Capture a DOM node to a PNG blob. Element should already be mounted. */
export async function captureNodeToPng(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);
  // Give the browser a full frame to paint the decoded bitmaps.
  await new Promise((r) => setTimeout(r, 300));
  // Render twice — first pass primes the offscreen canvas, second is clean.
  await toPng(node, { cacheBust: true, pixelRatio: 1, skipFonts: true });
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    skipFonts: true,
    backgroundColor: "#F5F0EB",
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

/** Trigger native share with PNG file only. Falls back to download. */
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

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  try {
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title, text });
      return "shared";
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "shared";
  }

  // Fallback: download the PNG
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

// Kept for backwards compat (not used in image-only flow)
export type ShareableOutfit = Pick<Outfit, "name" | "occasion"> & {
  items: ClothingItem[];
};
