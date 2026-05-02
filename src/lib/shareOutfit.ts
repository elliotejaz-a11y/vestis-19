import { toPng } from "html-to-image";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { batchResolveSignedClothingImageFields } from "@/lib/storage";

/** Fetch an image URL and return a data: URL so html-to-image can embed it. */
export async function urlToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-cache" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[shareOutfit] failed to inline image", url, err);
    return url; // best-effort fallback
  }
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

/** Wait for all <img> inside a node to finish loading before snapshotting. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
  );
}

/** Capture a DOM node to a PNG blob. Element should already be mounted. */
export async function captureNodeToPng(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);
  await new Promise((r) => setTimeout(r, 80));
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
