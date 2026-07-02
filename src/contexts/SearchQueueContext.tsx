import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ClothingItem } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { removeBackgroundInWorker } from "@/lib/bgRemovalWorker";

export interface SearchResult {
  title: string;
  brand: string;
  price: string;
  priceNumeric: number;
  imageUrl: string;
  productLink: string;
  source: string;
}

type OnAdd = (item: ClothingItem, options?: { runBackgroundRemoval?: boolean }) => Promise<void> | void;
type QueueStatus = "pending" | "processing" | "done" | "error";

export interface QueueItem {
  queueId: string;
  itemId: string;
  title: string;
  thumbnailUrl: string;
  status: QueueStatus;
}

interface InternalQueueItem extends QueueItem {
  result: SearchResult;
  onAdd: OnAdd;
}

interface SearchQueueContextValue {
  queue: QueueItem[];
  addToQueue: (result: SearchResult, onAdd: OnAdd) => string;
}

const SearchQueueContext = createContext<SearchQueueContextValue | null>(null);

const MAX_CONCURRENT = 2;

// Resize to ≤512px using createImageBitmap (off-main-thread decode) +
// OffscreenCanvas (off-main-thread draw), then encode the tiny result.
// This avoids the multi-second FileReader freeze on large source images.
async function resizeAndBase64(blob: Blob, maxDim = 512): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height, 1));
    const w = Math.round(bitmap.width * scale) || 1;
    const h = Math.round(bitmap.height * scale) || 1;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const small = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        resolve(r.includes(",") ? r.split(",")[1] : r);
      };
      reader.onerror = reject;
      reader.readAsDataURL(small);
    });
  } catch {
    // Fallback: encode original (may be slow on old browsers)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        resolve(r.includes(",") ? r.split(",")[1] : r);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export function SearchQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<InternalQueueItem[]>([]);
  const activeCount = useRef(0);
  const pendingRef = useRef<InternalQueueItem[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const setStatus = (queueId: string, status: QueueStatus) =>
    setQueue((prev) => prev.map((q) => (q.queueId === queueId ? { ...q, status } : q)));

  const processItem = useCallback(async (item: InternalQueueItem) => {
    setStatus(item.queueId, "processing");
    // Yield to the event loop so the UI renders "Queued" before work starts
    await new Promise((r) => setTimeout(r, 0));
    try {
      const res = await fetch(item.result.imageUrl);
      const blob = await res.blob();

      // Run background removal (in worker, off-main-thread) and AI analysis in parallel.
      // Worker keeps ONNX inference off the UI thread so there are no freezes.
      // If bg removal fails we fall back to the original image silently.
      const [cleanedBlob, aiData] = await Promise.all([
        removeBackgroundInWorker(blob).catch(() => blob),
        resizeAndBase64(blob)
          .then((base64) => supabase.functions.invoke("vestis-analyze-item", { body: { imageBase64: base64 } }))
          .then(({ data }) => data ?? null)
          .catch(() => null),
      ]);

      const finalImageUrl = URL.createObjectURL(cleanedBlob);
      const aiTags: string[] = aiData?.style_tags ?? [];
      const brandTag = item.result.brand ? [item.result.brand.toLowerCase()] : [];

      // Image is already cleaned — no need to trigger client-side bg removal in addItem
      await item.onAdd(
        {
          id: item.itemId,
          name: item.result.title,
          category: aiData?.category ?? "",
          color: aiData?.color ?? "",
          fabric: aiData?.fabric ?? "",
          imageUrl: finalImageUrl,
          tags: [...new Set([...aiTags, ...brandTag])],
          notes: item.result.source ? `Source: ${item.result.source}` : "",
          addedAt: new Date(),
          estimatedPrice: aiData?.estimated_price_nzd || item.result.priceNumeric || undefined,
          isPrivate: false,
        } as ClothingItem,
        { runBackgroundRemoval: false }
      );

      setStatus(item.queueId, "done");

      const savedId = item.itemId;
      const shortTitle = item.title.length > 40 ? item.title.slice(0, 40) + "…" : item.title;
      toast({
        title: shortTitle,
        description: "Added to wardrobe — tap to view",
        action: (
          <button
            onClick={() => navigate(`/?openItem=${savedId}`)}
            className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
          >
            View
          </button>
        ) as any,
      });
    } catch (err) {
      console.error("[SearchQueue] processing failed:", err);
      setStatus(item.queueId, "error");
      const shortTitle = item.title.length > 40 ? item.title.slice(0, 40) + "…" : item.title;
      toast({
        title: "Couldn't add item",
        description: `${shortTitle} failed to process. Please try again.`,
        variant: "destructive",
      });
    }
  }, [toast, navigate]);

  const drain = useCallback(() => {
    while (activeCount.current < MAX_CONCURRENT && pendingRef.current.length > 0) {
      const item = pendingRef.current.shift()!;
      activeCount.current++;
      processItem(item).finally(() => {
        activeCount.current--;
        drain();
      });
    }
  }, [processItem]);

  const addToQueue = useCallback((result: SearchResult, onAdd: OnAdd) => {
    const item: InternalQueueItem = {
      queueId: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      title: result.title,
      thumbnailUrl: result.imageUrl,
      status: "pending",
      result,
      onAdd,
    };
    setQueue((prev) => [...prev, item]);
    pendingRef.current.push(item);
    drain();
    return item.queueId;
  }, [drain]);

  const publicQueue: QueueItem[] = queue.map(({ queueId, itemId, title, thumbnailUrl, status }) => ({
    queueId, itemId, title, thumbnailUrl, status,
  }));

  return (
    <SearchQueueContext.Provider value={{ queue: publicQueue, addToQueue }}>
      {children}
    </SearchQueueContext.Provider>
  );
}

export function useSearchQueue() {
  const ctx = useContext(SearchQueueContext);
  if (!ctx) throw new Error("useSearchQueue must be used within SearchQueueProvider");
  return ctx;
}
