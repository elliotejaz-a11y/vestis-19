import { createContext, useCallback, useContext, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
import { MassUploadCandidate } from "@/types/massUpload";
import { ClothingCategory, ClothingItem } from "@/types/wardrobe";
import { generateClothingImage } from "@/services/imageGenerationService";

export type MassUploadPhase = "idle" | "analysing" | "extracting" | "ready";

interface DetectedItem {
  id: string;
  name: string;
  category: ClothingItem["category"];
  color: string;
  fabric: string;
  tags: string[];
  notes?: string;
  estimated_price_nzd?: number;
  confidence?: number;
  crop_hint?: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

type ItemWithSource = DetectedItem & { _sourceBase64: string };

function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

async function cropToBase64(
  sourceBase64: string,
  bbox: { x: number; y: number; width: number; height: number } | undefined,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      if (bbox) {
        const pad = 0.06;
        const sx = Math.max(0, (bbox.x - pad) * iw);
        const sy = Math.max(0, (bbox.y - pad) * ih);
        const sw = Math.min(iw - sx, (bbox.width + 2 * pad) * iw);
        const sh = Math.min(ih - sy, (bbox.height + 2 * pad) * ih);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 512, 512);
      } else {
        const side = Math.min(iw, ih);
        ctx.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, 512, 512);
      }
      resolve(canvas.toDataURL("image/jpeg", 0.88).split(",")[1]);
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${sourceBase64}`;
  });
}

// Builds an inpainting mask from a bg-removed transparent PNG.
// Garment pixels (alpha > 10) → black (SD preserves these).
// Background pixels (alpha = 0)  → white (SD repaints these to a clean white bg).
async function createGarmentMask(bgRemovedBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bgRemovedBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = imageData.data;
      for (let i = 0; i < px.length; i += 4) {
        const keep = px[i + 3] > 10;
        px[i] = keep ? 0 : 255;
        px[i + 1] = keep ? 0 : 255;
        px[i + 2] = keep ? 0 : 255;
        px[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png").split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("mask creation failed")); };
    img.src = url;
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface ContextValue {
  phase: MassUploadPhase;
  mode: "pile" | "outfit";
  candidates: MassUploadCandidate[];
  extracted: number;
  total: number;
  analysisDone: number;
  analysisTotal: number;
  reviewOpen: boolean;
  startProcessing: (files: File[], mode: "pile" | "outfit") => void;
  openReview: () => void;
  closeReview: () => void;
  updateCandidate: (id: string, patch: Partial<MassUploadCandidate>) => void;
  addCandidateToWardrobe: (candidate: MassUploadCandidate) => Promise<void>;
  skipCandidate: (id: string) => void;
  reset: () => void;
}

const MassUploadContext = createContext<ContextValue | null>(null);

export function useMassUpload() {
  const ctx = useContext(MassUploadContext);
  if (!ctx) throw new Error("useMassUpload must be used within MassUploadProvider");
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean }) => Promise<void> | void;
}

export function MassUploadProvider({ children, onAdd }: ProviderProps) {
  const [phase, setPhase] = useState<MassUploadPhase>("idle");
  const [mode, setMode] = useState<"pile" | "outfit">("pile");
  const [candidates, setCandidates] = useState<MassUploadCandidate[]>([]);
  const [extracted, setExtracted] = useState(0);
  const [total, setTotal] = useState(0);
  const [analysisDone, setAnalysisDone] = useState(0);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);

  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  const sessionRef = useRef(0);
  const itemCounterRef = useRef(0);

  const updateCandidate = useCallback((id: string, patch: Partial<MassUploadCandidate>) => {
    setCandidates((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (patch.previewUrl && patch.previewUrl !== c.previewUrl && c.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(c.previewUrl);
      }
      return { ...c, ...patch };
    }));
  }, []);

  const openReview = useCallback(() => setReviewOpen(true), []);
  const closeReview = useCallback(() => setReviewOpen(false), []);

  const reset = useCallback(() => {
    sessionRef.current++;
    setPhase("idle");
    setCandidates((prev) => {
      prev.forEach((c) => { if (c.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(c.previewUrl); });
      return [];
    });
    setExtracted(0);
    setTotal(0);
    setAnalysisDone(0);
    setAnalysisTotal(0);
    setReviewOpen(false);
  }, []);

  const startProcessing = useCallback(async (files: File[], uploadMode: "pile" | "outfit") => {
    const mySession = ++sessionRef.current;
    itemCounterRef.current = 0;

    setPhase("analysing");
    setMode(uploadMode);
    setCandidates([]);
    setExtracted(0);
    setTotal(0);
    setAnalysisDone(0);
    setAnalysisTotal(files.length);
    setReviewOpen(false);

    try {
      // ── Phase 1: Analyse all uploaded images concurrently ──────────────────
      const allItemsWithSrc: ItemWithSource[] = [];

      await Promise.all(files.map(async (file) => {
        const base64 = await optimiseMassUploadImage(file);
        if (sessionRef.current !== mySession) return;

        const { data, error } = await supabase.functions.invoke("vestis-analyze-pile", {
          body: { imageBase64: base64, mode: uploadMode },
        });
        if (sessionRef.current !== mySession) return;

        setAnalysisDone((prev) => prev + 1);

        const items: DetectedItem[] = (error ? [] : data?.items) ?? [];
        if (items.length === 0) return;

        const idxStart = itemCounterRef.current;
        itemCounterRef.current += items.length;

        const itemsWithSrc: ItemWithSource[] = items.map((item, i) => ({
          ...item,
          id: `${idxStart + i}-${item.id}`,
          _sourceBase64: base64,
        }));

        allItemsWithSrc.push(...itemsWithSrc);
        setTotal((prev) => prev + items.length);
      }));

      if (sessionRef.current !== mySession) return;
      if (allItemsWithSrc.length === 0) { setPhase("ready"); return; }

      // ── Phase 2: Generate AI images sequentially ───────────────────────────
      setPhase("extracting");

      for (const item of allItemsWithSrc) {
        if (sessionRef.current !== mySession) return;

        const baseCandidate: MassUploadCandidate = {
          id: item.id,
          name: item.name,
          category: item.category as ClothingCategory,
          color: item.color,
          fabric: item.fabric,
          tags: item.tags || [],
          notes: item.notes || "",
          estimatedPrice: item.estimated_price_nzd,
          confidence: item.confidence,
          cropHint: item.crop_hint,
          bbox: item.bbox,
          previewStatus: "extracting",
          addState: "idle",
        };

        let finalCandidate: MassUploadCandidate;
        let previewUrl: string | null = null;

        try {
          const croppedBase64 = await cropToBase64(item._sourceBase64, item.bbox);
          const croppedBlob = base64ToBlob(croppedBase64, "image/jpeg");

          // Use bg removal to build a smart mask:
          //   garment pixels → black (SD preserves them)
          //   background pixels → white (SD repaints to clean white)
          const { removeBackground } = await import("@imgly/background-removal");
          const bgRemovedBlob = await removeBackground(croppedBlob);
          const maskBase64 = await createGarmentMask(bgRemovedBlob);

          const imageBase64 = await generateClothingImage(
            { name: item.name, category: item.category, color: item.color, fabric: item.fabric },
            croppedBase64,
            maskBase64,
          );

          if (imageBase64) {
            // Pixazo preserved the garment and painted white bg — use directly
            previewUrl = URL.createObjectURL(base64ToBlob(imageBase64));
          } else {
            // Pixazo failed — fall back to local bg-removed crop on white
            const canvas = document.createElement("canvas");
            const size = 512;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size, size);
            const bgImg = new Image();
            const bgUrl = URL.createObjectURL(bgRemovedBlob);
            await new Promise<void>((res, rej) => {
              bgImg.onload = () => { ctx.drawImage(bgImg, 0, 0, size, size); URL.revokeObjectURL(bgUrl); res(); };
              bgImg.onerror = rej;
              bgImg.src = bgUrl;
            });
            const fallbackBase64 = await blobToBase64(await new Promise<Blob>((res, rej) =>
              canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/png")
            ));
            previewUrl = URL.createObjectURL(base64ToBlob(fallbackBase64));
          }
        } catch {
          // generation failed — show error state
        }

        if (previewUrl) {
          finalCandidate = { ...baseCandidate, previewStatus: "ready", previewUrl };
        } else {
          finalCandidate = { ...baseCandidate, previewStatus: "failed", error: "Image generation failed — please try again" };
        }

        if (sessionRef.current === mySession) {
          setCandidates((prev) => [...prev, finalCandidate]);
          setExtracted((prev) => prev + 1);
        }
      }

      if (sessionRef.current !== mySession) return;
      setPhase("ready");
    } catch (err) {
      console.error("Mass upload failed", err);
      if (sessionRef.current === mySession) setPhase("idle");
    }
  }, []);

  const addCandidateToWardrobe = useCallback(async (candidate: MassUploadCandidate) => {
    updateCandidate(candidate.id, { addState: "saving" });
    try {
      await onAddRef.current(
        {
          id: crypto.randomUUID(),
          name: candidate.name,
          category: candidate.category,
          color: candidate.color,
          fabric: candidate.fabric,
          imageUrl: candidate.previewUrl!,
          tags: [...candidate.tags, candidate.category, candidate.fabric.toLowerCase(), candidate.color.toLowerCase()].filter(Boolean),
          notes: candidate.notes,
          estimatedPrice: candidate.estimatedPrice,
          addedAt: new Date(),
        },
        { runBackgroundRemoval: false },
      );
      updateCandidate(candidate.id, { addState: "saved" });
    } catch (err) {
      updateCandidate(candidate.id, { addState: "idle", error: err instanceof Error ? err.message : "Could not add item" });
      throw err;
    }
  }, [updateCandidate]);

  const skipCandidate = useCallback((id: string) => {
    updateCandidate(id, { addState: "skipped" });
  }, [updateCandidate]);

  return (
    <MassUploadContext.Provider
      value={{
        phase,
        mode,
        candidates,
        extracted,
        total,
        analysisDone,
        analysisTotal,
        reviewOpen,
        startProcessing,
        openReview,
        closeReview,
        updateCandidate,
        addCandidateToWardrobe,
        skipCandidate,
        reset,
      }}
    >
      {children}
    </MassUploadContext.Provider>
  );
}
