import { useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ColorPicker, joinColors } from "@/components/ColorPicker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { base64ToDataUrl, fileToDataUrl, isAllowedMassUploadImage, optimiseMassUploadImage } from "@/lib/wardrobeMassUpload";
import { CATEGORIES, ClothingCategory, ClothingItem } from "@/types/wardrobe";
import { MassUploadCandidate, WARDROBE_FABRICS } from "@/types/massUpload";
import { Check, ImagePlus, Loader2, Sparkles, X } from "lucide-react";

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => Promise<void> | void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AnalyseResponse {
  items: Array<{
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
  }>;
}

const EMPTY_PROGRESS = { analysed: false, extracted: 0, total: 0 };

export function MassUploadSheet({ onAdd, children, open: openProp, onOpenChange }: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const [scenePreviewUrl, setScenePreviewUrl] = useState<string>("");
  const [analysing, setAnalysing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [candidates, setCandidates] = useState<MassUploadCandidate[]>([]);
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const completion = useMemo(() => {
    if (!progress.total) return progress.analysed ? 25 : 0;
    return Math.min(100, 25 + Math.round((progress.extracted / progress.total) * 75));
  }, [progress]);

  const reset = () => {
    setScenePreviewUrl("");
    setCandidates([]);
    setAnalysing(false);
    setExtracting(false);
    setProgress(EMPTY_PROGRESS);
  };

  const updateCandidate = (id: string, patch: Partial<MassUploadCandidate>) => {
    setCandidates((prev) => prev.map((candidate) => (candidate.id === id ? { ...candidate, ...patch } : candidate)));
  };

  const extractPreviews = async (imageBase64: string, detectedItems: AnalyseResponse["items"]) => {
    if (detectedItems.length === 0) return;

    setExtracting(true);
    setProgress({ analysed: true, extracted: 0, total: detectedItems.length });

    for (const item of detectedItems) {
      try {
        const { data, error } = await supabase.functions.invoke("extract-pile-item", {
          body: {
            sourceImageBase64: imageBase64,
            item,
          },
        });

        if (error) throw error;

        updateCandidate(item.id, {
          previewStatus: "ready",
          previewUrl: base64ToDataUrl(data.imageBase64),
        });
      } catch (error) {
        updateCandidate(item.id, {
          previewStatus: "failed",
          error: error instanceof Error ? error.message : "Preview extraction failed",
        });
      } finally {
        setProgress((prev) => ({ ...prev, extracted: Math.min(prev.total, prev.extracted + 1) }));
      }
    }

    setExtracting(false);
  };

  const handleSceneUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedMassUploadImage(file)) {
      toast({
        title: "Invalid image",
        description: "Use a JPG, PNG, or WebP image up to 10MB.",
        variant: "destructive",
      });
      return;
    }

    setScenePreviewUrl(await fileToDataUrl(file));
    setAnalysing(true);
    setCandidates([]);
    setProgress(EMPTY_PROGRESS);

    try {
      const optimisedBase64 = await optimiseMassUploadImage(file);

      const { data, error } = await supabase.functions.invoke("analyze-clothing-pile", {
        body: { imageBase64: optimisedBase64 },
      });

      if (error) throw error;

      const detectedItems = ((data as AnalyseResponse)?.items ?? []).map<MassUploadCandidate>((item) => ({
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
      }));

      setCandidates(detectedItems);
      setProgress({ analysed: true, extracted: 0, total: detectedItems.length });

      toast({
        title: "Pile analysed ✨",
        description: detectedItems.length
          ? `Found ${detectedItems.length} item${detectedItems.length === 1 ? "" : "s"}.`
          : "No clear items were found — try a brighter, less cluttered photo.",
      });

      await extractPreviews(optimisedBase64, (data as AnalyseResponse)?.items ?? []);
    } catch (error) {
      console.error("Mass upload analysis failed", error);
      toast({
        title: "Analysis failed",
        description: "Try a clearer photo with the clothes spread out a little more.",
        variant: "destructive",
      });
    } finally {
      setAnalysing(false);
    }
  };

  const handleAddCandidate = async (candidate: MassUploadCandidate) => {
    if (!candidate.previewUrl) {
      toast({ title: "Preview still loading", description: "Wait for the cut-out image before adding it." });
      return;
    }

    updateCandidate(candidate.id, { addState: "saving" });

    try {
      await onAdd(
        {
          id: crypto.randomUUID(),
          name: candidate.name,
          category: candidate.category,
          color: candidate.color,
          fabric: candidate.fabric,
          imageUrl: candidate.previewUrl,
          tags: [...candidate.tags, candidate.category, candidate.fabric.toLowerCase(), candidate.color.toLowerCase()].filter(Boolean),
          notes: candidate.notes,
          estimatedPrice: candidate.estimatedPrice,
          addedAt: new Date(),
        },
        { runBackgroundRemoval: false },
      );

      updateCandidate(candidate.id, { addState: "saved" });
    } catch (error) {
      updateCandidate(candidate.id, { addState: "idle", error: error instanceof Error ? error.message : "Could not add item" });
      toast({ title: "Couldn’t save item", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleSkipCandidate = (candidateId: string) => {
    updateCandidate(candidateId, { addState: "skipped" });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl bg-background px-5 pb-10 pt-8">
        <SheetHeader>
          <SheetTitle className="tracking-tight">Mass Upload</SheetTitle>
          <SheetDescription>
            Upload one photo of a pile, rail, or wardrobe section and review each detected piece before adding it.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {!scenePreviewUrl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 text-center transition-colors hover:bg-muted"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Upload a pile or closet photo</p>
                <p className="text-xs text-muted-foreground">The AI will detect separate items, cut them out, and prefill wardrobe details.</p>
              </div>
            </button>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <img src={scenePreviewUrl} alt="Clothing pile preview" className="h-52 w-full object-cover" loading="eager" />
              <div className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Scanning your wardrobe pile</p>
                    <p className="text-xs text-muted-foreground">
                      {analysing
                        ? "Finding distinct pieces and attributes..."
                        : extracting
                          ? `Creating clean cut-outs for ${progress.total} detected item${progress.total === 1 ? "" : "s"}.`
                          : `${candidates.length} candidate item${candidates.length === 1 ? "" : "s"} ready to review.`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Reset mass upload">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Progress value={completion} className="h-2 rounded-full bg-secondary" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{progress.analysed ? "Pile analysed" : "Waiting for analysis"}</span>
                  <span>{progress.total ? `${progress.extracted}/${progress.total} cut-outs ready` : "Preparing"}</span>
                </div>
              </div>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSceneUpload} />

          {(analysing || extracting) && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span>{analysing ? "Analysing the full image..." : "Generating clean item previews..."}</span>
            </div>
          )}

          {candidates.length > 0 && (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <MassUploadCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onChange={updateCandidate}
                  onAdd={handleAddCandidate}
                  onSkip={handleSkipCandidate}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MassUploadCandidateCard({
  candidate,
  onChange,
  onAdd,
  onSkip,
}: {
  candidate: MassUploadCandidate;
  onChange: (id: string, patch: Partial<MassUploadCandidate>) => void;
  onAdd: (candidate: MassUploadCandidate) => Promise<void>;
  onSkip: (id: string) => void;
}) {
  const [colors, setColors] = useState<string[]>(candidate.color ? [candidate.color] : []);

  const update = (patch: Partial<MassUploadCandidate>) => onChange(candidate.id, patch);

  const disabled = candidate.addState === "saved" || candidate.addState === "skipped";

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
          {candidate.previewUrl ? (
            <img src={candidate.previewUrl} alt={candidate.name} className="h-32 w-full object-contain bg-white dark:bg-muted" />
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              {candidate.previewStatus === "failed" ? <X className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{candidate.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {candidate.confidence ? `${Math.round(candidate.confidence * 100)}% confidence` : "AI detected item"}
              </p>
            </div>
            {candidate.addState === "saved" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-medium text-accent">
                <Check className="h-3 w-3" /> Added
              </span>
            ) : candidate.addState === "skipped" ? (
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-secondary-foreground">Skipped</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Name</Label>
              <Input value={candidate.name} disabled={disabled} onChange={(e) => update({ name: e.target.value })} className="mt-1 rounded-xl bg-background" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Category</Label>
              <Select value={candidate.category} disabled={disabled} onValueChange={(value) => update({ category: value as ClothingCategory })}>
                <SelectTrigger className="mt-1 rounded-xl bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.icon} {option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Fabric</Label>
              <Select value={candidate.fabric} disabled={disabled} onValueChange={(value) => update({ fabric: value })}>
                <SelectTrigger className="mt-1 rounded-xl bg-background text-xs"><SelectValue placeholder="Fabric" /></SelectTrigger>
                <SelectContent>
                  {WARDROBE_FABRICS.map((fabric) => (
                    <SelectItem key={fabric} value={fabric}>{fabric}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Price</Label>
              <Input
                type="number"
                value={candidate.estimatedPrice ?? ""}
                disabled={disabled}
                onChange={(e) => update({ estimatedPrice: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1 rounded-xl bg-background"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Colours</Label>
            <div className="mt-2">
              <ColorPicker
                selected={colors}
                onChange={(nextColors) => {
                  setColors(nextColors);
                  update({ color: joinColors(nextColors) });
                }}
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Notes</Label>
            <Textarea value={candidate.notes} disabled={disabled} onChange={(e) => update({ notes: e.target.value })} className="mt-1 min-h-[72px] rounded-xl bg-background text-sm" />
          </div>

          {candidate.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {candidate.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">{tag}</span>
              ))}
            </div>
          )}

          {candidate.error ? <p className="text-[11px] text-destructive">{candidate.error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" disabled={disabled} onClick={() => onSkip(candidate.id)}>
              Skip
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={disabled || candidate.previewStatus !== "ready" || !candidate.name || !candidate.category}
              onClick={() => onAdd({ ...candidate, color: joinColors(colors) || candidate.color })}
            >
              {candidate.addState === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Add to wardrobe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}