import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ClothingItem } from "@/types/wardrobe";
import { processClothingImage } from "@/lib/image-processing";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  addToQueue: (result: SearchResult, onAdd: OnAdd) => void;
}

const SearchQueueContext = createContext<SearchQueueContextValue | null>(null);

const MAX_CONCURRENT = 2;

function blobToBase64(blob: Blob): Promise<string> {
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
    try {
      const res = await fetch(item.result.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "item.webp", { type: blob.type || "image/webp" });

      const [cleanBlob, aiData] = await Promise.all([
        processClothingImage(file).catch(() => null),
        blobToBase64(blob)
          .then((base64) => supabase.functions.invoke("vestis-analyze-item", { body: { imageBase64: base64 } }))
          .then(({ data }) => data ?? null)
          .catch(() => null),
      ]);

      const finalImageUrl = URL.createObjectURL(cleanBlob ?? blob);
      const aiTags: string[] = aiData?.style_tags ?? [];
      const brandTag = item.result.brand ? [item.result.brand.toLowerCase()] : [];

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
        { runBackgroundRemoval: true }
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
