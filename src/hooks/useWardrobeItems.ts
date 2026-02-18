import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type WardrobeItemStatus = "queued" | "processing" | "completed" | "failed";

export interface WardrobeItem {
  id: string;
  user_id: string;
  original_path: string;
  cutout_path: string | null;
  status: WardrobeItemStatus;
  error_message: string | null;
  name: string;
  category: string;
  created_at: string;
  updated_at: string;
  // Runtime-only: signed URLs for display
  original_url?: string;
  cutout_url?: string;
}

export function useWardrobeItems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Fetch all items
  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from("wardrobe_items" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch wardrobe items error:", error);
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as WardrobeItem[];

    // Generate signed URLs for all items
    const withUrls = await Promise.all(rows.map(async (item) => {
      const urls = await getSignedUrls(item);
      return { ...item, ...urls };
    }));

    setItems(withUrls);
    setLoading(false);

    // Start polling for any in-progress items
    for (const item of withUrls) {
      if (item.status === "queued" || item.status === "processing") {
        startPolling(item.id);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
    return () => {
      // Cleanup all polling intervals
      pollingRef.current.forEach((interval) => clearInterval(interval));
      pollingRef.current.clear();
    };
  }, [fetchItems]);

  const getSignedUrls = async (item: WardrobeItem) => {
    const result: { original_url?: string; cutout_url?: string } = {};

    const { data: origUrl } = await supabase.storage
      .from("wardrobe-originals")
      .createSignedUrl(item.original_path, 3600);
    if (origUrl?.signedUrl) result.original_url = origUrl.signedUrl;

    if (item.cutout_path) {
      const { data: cutUrl } = await supabase.storage
        .from("wardrobe-cutouts")
        .createSignedUrl(item.cutout_path, 3600);
      if (cutUrl?.signedUrl) result.cutout_url = cutUrl.signedUrl;
    }

    return result;
  };

  const startPolling = useCallback((itemId: string) => {
    if (pollingRef.current.has(itemId)) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("wardrobe_items" as any)
        .select("*")
        .eq("id", itemId)
        .single();

      if (error || !data) return;
      const row = data as unknown as WardrobeItem;

      if (row.status === "completed" || row.status === "failed") {
        clearInterval(pollingRef.current.get(itemId)!);
        pollingRef.current.delete(itemId);

        const urls = await getSignedUrls(row);
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...row, ...urls } : i))
        );

        if (row.status === "completed") {
          toast({ title: "Background removed ✨", description: row.name });
        } else {
          toast({ title: "Processing failed", description: row.error_message || "Unknown error", variant: "destructive" });
        }
      } else {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...row, original_url: i.original_url, cutout_url: i.cutout_url } : i))
        );
      }
    }, 3000);

    pollingRef.current.set(itemId, interval);
  }, [toast]);

  // Resize image client-side to reduce edge function CPU load
  const resizeImage = useCallback(async (file: File, maxSize = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/png",
          0.9
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Upload files and create wardrobe items
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user) return;

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "") + ".png";
      const storagePath = `${user.id}/${timestamp}_${safeName}`;

      // Resize client-side before uploading
      let uploadBlob: Blob;
      try {
        uploadBlob = await resizeImage(file, 800);
      } catch {
        uploadBlob = file;
      }

      // Upload resized image to wardrobe-originals
      const { error: uploadErr } = await supabase.storage
        .from("wardrobe-originals")
        .upload(storagePath, uploadBlob, { contentType: "image/png" });

      if (uploadErr) {
        toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
        continue;
      }

      // Insert DB row
      const itemName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      const { data: row, error: insertErr } = await supabase
        .from("wardrobe_items" as any)
        .insert({
          user_id: user.id,
          original_path: storagePath,
          name: itemName,
          status: "queued",
        })
        .select()
        .single();

      if (insertErr || !row) {
        toast({ title: "Failed to create item", description: insertErr?.message, variant: "destructive" });
        continue;
      }

      const newItem = row as unknown as WardrobeItem;

      // Get signed URL for original
      const { data: origUrl } = await supabase.storage
        .from("wardrobe-originals")
        .createSignedUrl(storagePath, 3600);

      setItems((prev) => [{ ...newItem, original_url: origUrl?.signedUrl }, ...prev]);

      // Trigger background removal
      supabase.functions.invoke("remove-background", {
        body: { wardrobe_item_id: newItem.id },
      }).catch((err) => console.error("BG removal invoke error:", err));

      // Start polling
      startPolling(newItem.id);
    }
  }, [user, toast, startPolling]);

  // Retry a failed item
  const retryItem = useCallback(async (itemId: string) => {
    await supabase
      .from("wardrobe_items" as any)
      .update({ status: "queued", error_message: null } as any)
      .eq("id", itemId);

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "queued" as const, error_message: null } : i))
    );

    supabase.functions.invoke("remove-background", {
      body: { wardrobe_item_id: itemId },
    }).catch((err) => console.error("Retry invoke error:", err));

    startPolling(itemId);
  }, [startPolling]);

  // Update item metadata
  const updateItem = useCallback(async (itemId: string, updates: { name?: string; category?: string }) => {
    await supabase
      .from("wardrobe_items" as any)
      .update(updates as any)
      .eq("id", itemId);

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  }, []);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Delete from storage
    await supabase.storage.from("wardrobe-originals").remove([item.original_path]);
    if (item.cutout_path) {
      await supabase.storage.from("wardrobe-cutouts").remove([item.cutout_path]);
    }

    // Delete DB row
    await supabase.from("wardrobe_items" as any).delete().eq("id", itemId);

    // Stop polling if active
    if (pollingRef.current.has(itemId)) {
      clearInterval(pollingRef.current.get(itemId)!);
      pollingRef.current.delete(itemId);
    }

    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, [items]);

  return { items, loading, uploadFiles, retryItem, updateItem, deleteItem, refetch: fetchItems };
}
