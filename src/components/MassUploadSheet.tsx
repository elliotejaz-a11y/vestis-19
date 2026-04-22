import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Loader2, Check, X, RefreshCw, Layers } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isAllowedWardrobeImageType, isAllowedWardrobeImageSize } from "@/lib/wardrobeImageProcessing";

interface DetectedItem {
  id: string;
  name: string;
  category: string;
  color: string;
  fabric: string;
  style_tags: string[];
  estimated_price_nzd: number;
  visual_description: string;
  cutoutUrl?: string;
  cutoutStatus: "pending" | "generating" | "ready" | "failed";
  cutoutError?: string;
  keep: boolean;
}

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => void;
  children: React.ReactNode;
}

type Step = "upload" | "detecting" | "review" | "saving";

const MAX_PARALLEL_GENERATIONS = 3;

export function MassUploadSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [pileImageUrl, setPileImageUrl] = useState("");
  const [pileBase64, setPileBase64] = useState("");
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [progressMsg, setProgressMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setStep("upload");
    setPileImageUrl("");
    setPileBase64("");
    setItems([]);
    setProgressMsg("");
  };

  const fileToBase64 = (file: File | Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resizeImage = (blob: Blob, maxDim: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.85
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });

  const generateCutout = async (item: DetectedItem, base64: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, cutoutStatus: "generating" } : it))
    );
    try {
      const { data, error } = await supabase.functions.invoke("extract-clothing-item", {
        body: {
          imageBase64: base64,
          itemName: item.name,
          visualDescription: item.visual_description,
          category: item.category,
          color: item.color,
          fabric: item.fabric,
        },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image returned");
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, cutoutUrl: data.imageUrl, cutoutStatus: "ready" } : it
        )
      );
    } catch (err) {
      console.error("Cutout generation failed:", err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                cutoutStatus: "failed",
                cutoutError: err instanceof Error ? err.message : "Failed",
              }
            : it
        )
      );
    }
  };

  const generateAllCutouts = async (detected: DetectedItem[], base64: string) => {
    // Run with limited parallelism
    let cursor = 0;
    const runWorker = async () => {
      while (cursor < detected.length) {
        const idx = cursor++;
        await generateCutout(detected[idx], base64);
      }
    };
    const workers = Array.from(
      { length: Math.min(MAX_PARALLEL_GENERATIONS, detected.length) },
      runWorker
    );
    await Promise.all(workers);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedWardrobeImageType(file.type)) {
      toast({ title: "Invalid file type", description: "Use JPG, PNG or WebP.", variant: "destructive" });
      return;
    }
    if (!isAllowedWardrobeImageSize(file.size)) {
      toast({ title: "File too large", description: "Max size 10MB.", variant: "destructive" });
      return;
    }

    setPileImageUrl(URL.createObjectURL(file));
    setStep("detecting");
    setProgressMsg("Analysing your pile…");

    try {
      const resized = await resizeImage(file, 1280);
      const base64 = await fileToBase64(resized);
      setPileBase64(base64);

      const { data, error } = await supabase.functions.invoke("analyze-clothing-pile", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      const detected: DetectedItem[] = (data?.items || []).map((it: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        name: it.name,
        category: it.category,
        color: it.color,
        fabric: it.fabric,
        style_tags: it.style_tags || [],
        estimated_price_nzd: it.estimated_price_nzd,
        visual_description: it.visual_description,
        cutoutStatus: "pending" as const,
        keep: true,
      }));

      if (detected.length === 0) {
        toast({
          title: "No items detected",
          description: "Try a clearer photo with separated items.",
          variant: "destructive",
        });
        reset();
        return;
      }

      setItems(detected);
      setStep("review");
      setProgressMsg("Generating clean previews…");
      toast({
        title: `${detected.length} item${detected.length === 1 ? "" : "s"} detected ✨`,
        description: "Generating clean previews now…",
      });
      // kick off cutout generation in background
      generateAllCutouts(detected, base64);
    } catch (err) {
      console.error("Pile analysis failed:", err);
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Try again with a clearer photo.",
        variant: "destructive",
      });
      reset();
    }
  };

  const toggleKeep = (id: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, keep: !it.keep } : it)));

  const retryCutout = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (item && pileBase64) generateCutout(item, pileBase64);
  };

  const updateField = (id: string, field: keyof DetectedItem, value: any) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));

  const handleAddSelected = async () => {
    const toAdd = items.filter((it) => it.keep && it.cutoutStatus === "ready");
    if (toAdd.length === 0) {
      toast({
        title: "Nothing to add",
        description: "Wait for previews to finish, or select at least one item.",
        variant: "destructive",
      });
      return;
    }
    setStep("saving");
    setProgressMsg(`Adding ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} to your wardrobe…`);

    for (const it of toAdd) {
      const tags = [
        ...(it.style_tags || []),
        (it.color || "").toLowerCase(),
        (it.fabric || "").toLowerCase(),
        it.category,
      ].filter(Boolean);

      onAdd({
        id: crypto.randomUUID(),
        name: it.name,
        category: it.category,
        color: it.color,
        fabric: it.fabric,
        imageUrl: it.cutoutUrl!,
        tags,
        notes: "",
        addedAt: new Date(),
        estimatedPrice: it.estimated_price_nzd,
      });
    }

    toast({
      title: "Added to wardrobe ✨",
      description: `${toAdd.length} item${toAdd.length === 1 ? "" : "s"} saved.`,
    });
    reset();
    setOpen(false);
  };

  const readyCount = items.filter((it) => it.cutoutStatus === "ready").length;
  const generatingCount = items.filter((it) => it.cutoutStatus === "generating").length;
  const keepCount = items.filter((it) => it.keep && it.cutoutStatus === "ready").length;

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background"
        style={{ paddingBottom: '6rem', zIndex: 10000 }}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" /> Mass Upload
          </SheetTitle>
        </SheetHeader>

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Snap a photo of a pile, drawer, or your closet. Our AI will spot every item, build a clean preview of each one, and pre-fill all the details.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-48 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Upload pile photo</span>
              <span className="text-[11px] text-muted-foreground">JPG, PNG or WebP · max 10MB</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-accent">Tips for best results</p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>Lay items flat or hang them clearly visible</li>
                <li>Good lighting, items not heavily overlapping</li>
                <li>The clearer the photo, the better the results</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Detecting */}
        {step === "detecting" && (
          <div className="mt-6 flex flex-col items-center gap-4 py-8">
            {pileImageUrl && (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-muted">
                <img src={pileImageUrl} alt="Pile" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin" />
                    <Sparkles className="w-5 h-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm font-semibold text-white">{progressMsg}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review */}
        {step === "review" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {items.length} item{items.length === 1 ? "" : "s"} detected
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {readyCount}/{items.length} previews ready
                  {generatingCount > 0 && ` · ${generatingCount} generating…`}
                </p>
              </div>
              {generatingCount > 0 && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
            </div>

            <div className="space-y-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-2xl border p-3 transition-colors ${
                    it.keep ? "bg-card border-accent/40" : "bg-muted/30 border-border opacity-60"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Cutout preview */}
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white dark:bg-neutral-800 shrink-0">
                      {it.cutoutStatus === "ready" && it.cutoutUrl && (
                        <img
                          src={it.cutoutUrl}
                          alt={it.name}
                          className="w-full h-full object-contain p-1"
                        />
                      )}
                      {(it.cutoutStatus === "pending" || it.cutoutStatus === "generating") && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted">
                          <Loader2 className="w-5 h-5 text-accent animate-spin" />
                          <span className="text-[9px] text-muted-foreground">
                            {it.cutoutStatus === "pending" ? "Queued" : "Rendering"}
                          </span>
                        </div>
                      )}
                      {it.cutoutStatus === "failed" && (
                        <button
                          onClick={() => retryCutout(it.id)}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 text-destructive"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-[9px]">Retry</span>
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={it.name}
                          onChange={(e) => updateField(it.id, "name", e.target.value)}
                          className="text-sm font-semibold text-foreground bg-transparent border-b border-transparent focus:border-accent focus:outline-none w-full"
                        />
                        <button
                          onClick={() => toggleKeep(it.id)}
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            it.keep
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                          aria-label={it.keep ? "Skip item" : "Keep item"}
                        >
                          {it.keep ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <select
                          value={it.category}
                          onChange={(e) => updateField(it.id, "category", e.target.value)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border-0 focus:outline-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {it.color}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {it.fabric}
                        </span>
                        {it.estimated_price_nzd > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                            ${it.estimated_price_nzd.toFixed(0)} NZD
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {it.visual_description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleAddSelected}
              disabled={keepCount === 0 || generatingCount > 0}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
            >
              {generatingCount > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Waiting for previews ({readyCount}/{items.length})
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add {keepCount} item{keepCount === 1 ? "" : "s"} to wardrobe
                </>
              )}
            </Button>
          </div>
        )}

        {/* STEP 4: Saving */}
        {step === "saving" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-sm font-semibold text-foreground">{progressMsg}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
