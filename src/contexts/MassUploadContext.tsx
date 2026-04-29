import { createContext, useCallback, useContext, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
import { processClothingImage } from "@/lib/image-processing";
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

// Internal only — not exposed through the context
type ItemWithSource = DetectedItem & { _sourceBase64: string };

async function cropItemPreview(
  sourceBase64: string,
  bbox: { x: number; y: number; width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: imgW, naturalHeight: imgH } = img;
      const pad = 0.06;
      const x = Math.max(0, bbox.x - pad) * imgW;
      const y = Math.max(0, bbox.y - pad) * imgH;
      const right = Math.min(1, bbox.x + bbox.width + pad) * imgW;
      const bottom = Math.min(1, bbox.y + bbox.height + pad) * imgH;
      const cw = right - x;
      const ch = bottom - y;
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, x, y, cw, ch, 0, 0, cw, ch);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${sourceBase64}`;
  });
}

interface ContextValue {
  phase: MassUploadPhase;
  mode: "pile" | "outfit";
  candidates: MassUploadCandidate[];
  extracted: number;
  total: number;
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
  const [reviewOpen, setReviewOpen] = useState(false);

  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  const sessionRef = useRef(0);

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
    setReviewOpen(false);
  }, []);

  const startProcessing = useCallback(async (files: File[], uploadMode: "pile" | "outfit") => {
    const mySession = ++sessionRef.current;

    setPhase("analysing");
    setMode(uploadMode);
    setCandidates([]);
    setExtracted(0);
    setTotal(0);
    setReviewOpen(false);

    try {
      // Optimise all images in parallel
      const optimisedImages = await Promise.all(files.map((f) => optimiseMassUploadImage(f)));
      if (sessionRef.current !== mySession) return;

      // Analyse all images in parallel
      const analysisResults = await Promise.all(
        optimisedImages.map((base64) =>
          supabase.functions.invoke("analyze-clothing-pile", {
            body: { imageBase64: base64, mode: uploadMode },
          }),
        ),
      );
      if (sessionRef.current !== mySession) return;

      // Collect all detected items, tagging each with its source image
      const allItems: ItemWithSource[] = [];
      for (let imgIdx = 0; imgIdx < analysisResults.length; imgIdx++) {
        const { data, error } = analysisResults[imgIdx];
        if (error) continue;
        const items: DetectedItem[] = data?.items ?? [];
        for (const item of items) {
          allItems.push({
            ...item,
            // Prefix with image index to guarantee uniqueness across images
            id: `${imgIdx}-${item.id}`,
            _sourceBase64: optimisedImages[imgIdx],
          });
        }
      }

      const n = allItems.length;
      setTotal(n);

      if (n === 0) {
        setPhase("ready");
        return;
      }

      setPhase("extracting");

      const results: MassUploadCandidate[] = allItems.map((item) => ({
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
        previewStatus: "extracting" as const,
        addState: "idle" as const,
      }));

      await Promise.all(
        allItems.map(async (item, idx) => {
          const sourceBase64 = item._sourceBase64;
          try {
            const { data: genData, error: genError } = await supabase.functions.invoke("extract-pile-item", {
              body: { sourceImageBase64: sourceBase64, item },
            });

            if (genError || !genData?.imageBase64) throw new Error(genError?.message ?? "No image returned");

            const binaryStr = atob(genData.imageBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const generatedBlob = new Blob([bytes], { type: "image/png" });

            let previewUrl = URL.createObjectURL(generatedBlob);
            try {
              const f = new File([generatedBlob], `item-${item.id}.png`, { type: "image/png" });
              const cleanedBlob = await processClothingImage(f);
              previewUrl = URL.createObjectURL(cleanedBlob);
            } catch {
              // bg removal failed — use AI-generated image as-is
            }

            results[idx] = { ...results[idx], previewStatus: "ready", previewUrl };
          } catch {
            // AI generation failed — fall back to crop
            try {
              const croppedUrl = item.bbox
                ? await cropItemPreview(sourceBase64, item.bbox)
                : `data:image/jpeg;base64,${sourceBase64}`;

              let previewUrl = croppedUrl;
              try {
                const res = await fetch(croppedUrl);
                const blob = await res.blob();
                const f = new File([blob], `item-${item.id}.jpg`, { type: "image/jpeg" });
                const cleanedBlob = await processClothingImage(f);
                previewUrl = URL.createObjectURL(cleanedBlob);
              } catch { /* use crop as-is */ }

              results[idx] = { ...results[idx], previewStatus: "ready", previewUrl };
            } catch {
              results[idx] = { ...results[idx], previewStatus: "failed", error: "Preview extraction failed" };
            }
          } finally {
            if (sessionRef.current === mySession) {
              setExtracted((prev) => Math.min(n, prev + 1));
            }
          }
        }),
      );

      if (sessionRef.current !== mySession) return;

      setCandidates(results);
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
