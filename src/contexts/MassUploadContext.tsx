import { createContext, useCallback, useContext, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
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

function buildPuterPrompt(item: DetectedItem): string {
  const category = item.category?.toLowerCase() ?? "";
  let prompt = `Professional fashion e-commerce product photograph of a ${item.color} ${item.name}`;
  if (item.fabric && item.fabric !== "Unknown") prompt += `, ${item.fabric} material`;
  if (item.tags?.length) prompt += `, ${item.tags.slice(0, 5).join(", ")} style`;
  if (item.notes) prompt += `. ${item.notes}`;

  if (category === "bottoms") {
    prompt += `. Flat lay on pure white background, both legs fully extended straight downward in parallel, waistband at top, garment completely unfolded`;
  } else if (category === "shoes") {
    prompt += `. Three-quarter front angle view on pure white background, pair of shoes shown together`;
  } else if (category === "dresses") {
    prompt += `. Flat lay on pure white background, dress fully spread out showing complete front silhouette`;
  } else if (category === "accessories") {
    prompt += `. Clean product shot on pure white background, item centred and well-lit`;
  } else {
    prompt += `. Flat lay on pure white background, garment fully spread out showing complete front face, collar at top`;
  }

  prompt += `. Pure white background, high-resolution studio lighting, sharp detail, clean minimal fashion e-commerce photography, isolated item only, no person, no model, no hanger, no shadow`;
  return prompt;
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

        const { data, error } = await supabase.functions.invoke("vestis-analyze-pile", {
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

        // Step 1: Generate product image via Puter.js (gpt-image-1, client-side, no API key needed)
        let previewUrl: string | null = null;
        try {
          const prompt = buildPuterPrompt(item);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imgEl: HTMLImageElement = await (window as any).puter.ai.txt2img(prompt, { model: "gpt-image-1", quality: "low" });
          const fetchRes = await fetch(imgEl.src);
          const generatedBlob = await fetchRes.blob();

          // Step 2: Apply background removal to generated image
          try {
            const { removeBackground } = await import("@imgly/background-removal");
            const bgRemovedBlob = await removeBackground(generatedBlob);
            previewUrl = URL.createObjectURL(bgRemovedBlob);
          } catch {
            previewUrl = URL.createObjectURL(generatedBlob);
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
