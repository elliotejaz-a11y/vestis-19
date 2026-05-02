import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { ClothingItem, Outfit } from "@/types/wardrobe";

/** Wait for all <img> inside a node to finish loading before snapshotting. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't block on a broken image
      });
    })
  );
}

/** Capture a DOM node to a PNG blob. Element should already be mounted. */
export async function captureNodeToPng(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);
  // Tiny delay so layout settles for cross-origin images
  await new Promise((r) => setTimeout(r, 60));
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    skipFonts: true,
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

/** Insert a shared_outfits row and return the public viewer URL. */
export async function createShareLink(params: {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  outfit: Pick<Outfit, "name" | "occasion" | "items"> & { items: ClothingItem[] };
}): Promise<{ shareId: string; url: string }> {
  const { userId, username, displayName, outfit } = params;
  const itemsPayload = outfit.items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    imageUrl: i.imageUrl,
  }));

  const { data, error } = await supabase
    .from("shared_outfits")
    .insert({
      user_id: userId,
      username: username ?? null,
      display_name: displayName ?? null,
      outfit_name: outfit.name ?? null,
      occasion: outfit.occasion ?? null,
      items: itemsPayload,
    })
    .select("id")
    .single();

  if (error || !data) throw error || new Error("Failed to create share link");

  const url = `${window.location.origin}/shared-outfit/${data.id}`;
  return { shareId: data.id, url };
}

/** Trigger native share with PNG file + url. Falls back to download + clipboard. */
export async function nativeShareOrFallback(opts: {
  pngBlob: Blob;
  url: string;
  title?: string;
  text?: string;
}): Promise<"shared" | "downloaded"> {
  const { pngBlob, url, title = "My Vestis Outfit", text = "Check out this outfit I made on Vestis" } = opts;
  const file = new File([pngBlob], "vestis-outfit.png", { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  try {
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], url, title, text });
      return "shared";
    }
    if (nav.share) {
      await nav.share({ url, title, text });
      // Also copy link for convenience
      try { await navigator.clipboard.writeText(url); } catch {}
      return "shared";
    }
  } catch (err) {
    // User cancelled or share failed — fall through to download fallback
    if ((err as Error)?.name === "AbortError") return "shared";
  }

  // Fallback: download the PNG + copy link to clipboard
  const objectUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "vestis-outfit.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  try { await navigator.clipboard.writeText(url); } catch {}
  return "downloaded";
}
