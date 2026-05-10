import { createContext, useCallback, useContext, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
import { processClothingImage } from "@/lib/image-processing";
import { generateClothingImage } from "@/services/imageGenerationService";
import { MassUploadCandidate } from "@/types/massUpload";
import { ClothingCategory, ClothingItem } from "@/types/wardrobe";

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

async function trimTransparentPadding(blob: Blob, alphaThreshold = 8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas is not available"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > alphaThreshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        resolve(blob);
        return;
      }

      const padding = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.04);
      const sx = Math.max(0, minX - padding);
      const sy = Math.max(0, minY - padding);
      const sw = Math.min(canvas.width - sx, maxX - minX + 1 + padding * 2);
      const sh = Math.min(canvas.height - sy, maxY - minY + 1 + padding * 2);
      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      out.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      out.toBlob(
        (trimmed) => trimmed ? resolve(trimmed) : reject(new Error("trim toBlob failed")),
        "image/png",
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

// Composites a bg-removed transparent PNG with a drop shadow and studio
// vibrancy, outputting a transparent PNG blob (alpha preserved for Supabase).
async function compositeWithSoftShadow(bgRemovedBlob: Blob, size = 512): Promise<Blob> {
  const trimmedBlob = await trimTransparentPadding(bgRemovedBlob);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(trimmedBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const dpr = Math.min(window.devicePixelRatio ?? 1, 3);
      const px = Math.round(size * dpr);
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const padding = size * 0.06;
      const maxDim = size - padding * 2;
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(img, x, y, w, h);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.filter = "contrast(1.1) saturate(1.05)";
      ctx.drawImage(img, x, y, w, h);
      ctx.filter = "none";
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")),
        "image/png",
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

async function createStudioFlatlayPreview(item: ItemWithSource): Promise<{ previewUrl: string; imageBase64: string }> {
  const generatedBase64 = await generateClothingImage(
    {
      name: item.name,
      category: item.category,
      color: item.color,
      fabric: item.fabric,
      tags: item.tags,
      notes: item.notes,
      cropHint: item.crop_hint,
      bbox: item.bbox,
    },
    item._sourceBase64,
  );

  const sourceBlob = generatedBase64
    ? base64ToBlob(generatedBase64, "image/png")
    : base64ToBlob(await cropToBase64(item._sourceBase64, item.bbox), "image/jpeg");
  const sourceFile = new File([sourceBlob], "mass-upload-item.png", { type: sourceBlob.type || "image/png" });
  const bgRemovedBlob = await processClothingImage(sourceFile);
  const finalBlob = await compositeWithSoftShadow(bgRemovedBlob);
  const finalBase64 = await blobToBase64(finalBlob);

  return {
    previewUrl: URL.createObjectURL(finalBlob),
    imageBase64: finalBase64,
  };
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

      // ── Phase 2: Generate clean studio flat lays, then bg-remove them ─────
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

        try {
          const { previewUrl, imageBase64 } = await createStudioFlatlayPreview(item);

          if (sessionRef.current === mySession) {
            setCandidates((prev) => [...prev, {
              ...baseCandidate,
              previewStatus: "ready",
              previewUrl,
              croppedBase64: imageBase64,
            }]);
            setExtracted((prev) => prev + 1);
          }
        } catch {
          if (sessionRef.current === mySession) {
            setCandidates((prev) => [...prev, {
              ...baseCandidate,
              previewStatus: "failed",
              error: "Could not crop image",
            }]);
            setExtracted((prev) => prev + 1);
          }
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
      let finalImageUrl = candidate.previewUrl!;

      await onAddRef.current(
        {
          id: crypto.randomUUID(),
          name: candidate.name,
          category: candidate.category,
          color: candidate.color,
          fabric: candidate.fabric,
          imageUrl: finalImageUrl,
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
