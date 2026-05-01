import { createContext, useCallback, useContext, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
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
      // Detection is cheap (text inference) so we parallelise it to keep the
      // analysing phase fast even with many files.
      const allItemsWithSrc: ItemWithSource[] = [];

      await Promise.all(files.map(async (file) => {
        const base64 = await optimiseMassUploadImage(file);
        if (sessionRef.current !== mySession) return;

        const { data, error } = await supabase.functions.invoke("analyze-clothing-pile", {
          body: { imageBase64: base64, mode: uploadMode },
        });
        if (sessionRef.current !== mySession) return;

        setAnalysisDone((prev) => prev + 1);

        const items: DetectedItem[] = (error ? [] : data?.items) ?? [];
        if (items.length === 0) return;

        // Assign stable IDs — safe between awaits in single-threaded JS
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

      // ── Phase 2: Generate AI images sequentially ────────────────────────────
      // HuggingFace free tier has strict rate limits, so we process one item at
      // a time with a short delay between calls to avoid 429 errors.
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

        // Try FLUX.1-schnell generation via edge function
        const imageBase64 = await generateClothingImage(item, item._sourceBase64);

        if (imageBase64) {
          const binaryStr = atob(imageBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: "image/png" });
          const previewUrl = URL.createObjectURL(blob);
          finalCandidate = { ...baseCandidate, previewStatus: "ready", previewUrl };
        } else {
          // Fallback: show the original source image so the item is never lost
          try {
            const srcBytes = Uint8Array.from(atob(item._sourceBase64), (c) => c.charCodeAt(0));
            const srcBlob = new Blob([srcBytes], { type: "image/jpeg" });
            const previewUrl = URL.createObjectURL(srcBlob);
            finalCandidate = { ...baseCandidate, previewStatus: "ready", previewUrl };
          } catch {
            finalCandidate = { ...baseCandidate, previewStatus: "failed", error: "Could not generate image" };
          }
        }

        if (sessionRef.current === mySession) {
          setCandidates((prev) => [...prev, finalCandidate]);
          setExtracted((prev) => prev + 1);
        }

        // Brief pause between HF calls to stay within free-tier rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
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
