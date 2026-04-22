import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Loader2, Check, X, Layers } from "lucide-react";
import { ClothingItem } from "@/types/wardrobe";
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
  location_hint: string;
  /** Generated clean product image URL (data: URL). undefined while pending, null on failure. */
  cleanImageUrl?: string | null;
  status: "pending" | "extracting" | "ready" | "failed";
  selected: boolean;
}

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => void;
  children: React.ReactNode;
}

type Phase = "idle" | "analyzing" | "extracting" | "review";

export function MassUploadSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceImage, setSourceImage] = useState<string>("");
  const [sourceBase64, setSourceBase64] = useState<string>("");
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 });
  const [adding, setAdding] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fileToBase64 = (file: File | Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
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

  const reset = () => {
    setPhase("idle");
    setSourceImage("");
    setSourceBase64("");
    setItems([]);
    setExtractProgress({ done: 0, total: 0 });
    setAdding(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be picked again
    if (!isAllowedWardrobeImageType(file.type)) {
      toast({ title: "Invalid file type", description: "Use JPG, PNG or WebP.", variant: "destructive" });
      return;
    }
    if (!isAllowedWardrobeImageSize(file.size)) {
      toast({ title: "File too large", description: "Max size 10MB.", variant: "destructive" });
      return;
    }

    setSourceImage(URL.createObjectURL(file));
    setPhase("analyzing");

    try {
      const resized = await resizeImage(file, 1280);
      const base64 = await fileToBase64(resized);
      setSourceBase64(base64);

      const { data, error } = await supabase.functions.invoke("analyze-clothing-pile", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;

      const detected: any[] = data?.items || [];
      if (detected.length === 0) {
        toast({ title: "No items detected", description: "Try a clearer photo with the items spread out.", variant: "destructive" });
        reset();
        return;
      }

      const initial: DetectedItem[] = detected.map((d, idx) => ({
        id: `${Date.now()}-${idx}`,
        name: d.name,
        category: d.category,
        color: d.color,
        fabric: d.fabric,
        style_tags: d.style_tags || [],
        estimated_price_nzd: d.estimated_price_nzd,
        location_hint: d.location_hint || "",
        status: "pending",
        selected: true,
      }));
      setItems(initial);
      setPhase("extracting");
      setExtractProgress({ done: 0, total: initial.length });

      // Sequentially generate clean images (avoid rate limits)
      for (let i = 0; i < initial.length; i++) {
        const it = initial[i];
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "extracting" } : p)));
        try {
          const { data: extractData, error: extractError } = await supabase.functions.invoke("extract-clothing-item", {
            body: {
              imageBase64: base64,
              name: it.name,
              category: it.category,
              color: it.color,
              fabric: it.fabric,
              locationHint: it.location_hint,
            },
          });
          if (extractError) throw extractError;
          const cleanUrl = extractData?.imageUrl;
          if (!cleanUrl) throw new Error("No image returned");
          setItems((prev) =>
            prev.map((p) => (p.id === it.id ? { ...p, status: "ready", cleanImageUrl: cleanUrl } : p))
          );
        } catch (err) {
          console.error(`[mass-upload] extraction failed for ${it.name}`, err);
          setItems((prev) =>
            prev.map((p) => (p.id === it.id ? { ...p, status: "failed", cleanImageUrl: null, selected: false } : p))
          );
        } finally {
          setExtractProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }

      setPhase("review");
    } catch (err: any) {
      console.error("[mass-upload] analyze failed", err);
      toast({
        title: "Analysis failed",
        description: err?.message || "Try again with a different photo.",
        variant: "destructive",
      });
      reset();
    }
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((p) => (p.id === id && p.status === "ready" ? { ...p, selected: !p.selected } : p)));
  };

  const handleAddSelected = async () => {
    const toAdd = items.filter((i) => i.selected && i.status === "ready" && i.cleanImageUrl);
    if (toAdd.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one item to add.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      for (const it of toAdd) {
        const tags = [
          ...(it.style_tags || []),
          (it.color || "").toLowerCase(),
          (it.fabric || "").toLowerCase(),
          it.category,
        ].filter(Boolean);
        const cleanUrl = it.cleanImageUrl as string;
        const imageBase64ForProcessing = cleanUrl.startsWith("data:")
          ? cleanUrl.split(",")[1]
          : undefined;

        onAdd(
          {
            id: crypto.randomUUID(),
            name: it.name,
            category: it.category,
            color: it.color,
            fabric: it.fabric,
            imageUrl: cleanUrl,
            tags,
            notes: "",
            addedAt: new Date(),
            estimatedPrice: it.estimated_price_nzd,
          },
          { runBackgroundRemoval: false, imageBase64ForProcessing }
        );
      }
      toast({
        title: `Added ${toAdd.length} item${toAdd.length === 1 ? "" : "s"}`,
        description: "They're now in your wardrobe.",
      });
      reset();
      setOpen(false);
    } catch (err: any) {
      console.error("[mass-upload] add failed", err);
      toast({ title: "Adding failed", description: err?.message || "Please try again.", variant: "destructive" });
      setAdding(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected && i.status === "ready").length;
  const readyCount = items.filter((i) => i.status === "ready").length;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background"
        style={{ paddingBottom: "6rem", zIndex: 10000 }}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            Mass Upload
          </SheetTitle>
        </SheetHeader>

        {phase === "idle" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a photo of a pile of clothes, your closet, or a flat-lay — our AI will detect every item, generate a clean
              product image for each one, and let you choose which to add.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Sparkles className="w-7 h-7" />
                <span className="text-xs font-semibold">Take Photo</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-7 h-7" />
                <span className="text-xs font-semibold">Upload Photo</span>
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
            <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Tips for best results</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Spread items out so each one is visible</li>
                <li>Good lighting, ideally on a plain surface</li>
                <li>Up to 30 items per photo</li>
              </ul>
            </div>
          </div>
        )}

        {(phase === "analyzing" || phase === "extracting") && (
          <div className="mt-6 space-y-4">
            {sourceImage && (
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                <img src={sourceImage} alt="Source" className="w-full h-48 object-cover blur-[2px] scale-[1.02]" />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin" />
                    <Sparkles className="w-5 h-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">
                      {phase === "analyzing" ? "Detecting items…" : "Generating clean images…"}
                    </p>
                    <p className="text-[11px] text-white/70 mt-1">
                      {phase === "analyzing"
                        ? "Identifying every piece in the photo"
                        : `${extractProgress.done} of ${extractProgress.total} processed`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {phase === "extracting" && items.length > 0 && (
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{
                      width: `${extractProgress.total ? (extractProgress.done / extractProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="aspect-square rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden relative"
                    >
                      {it.status === "ready" && it.cleanImageUrl ? (
                        <img src={it.cleanImageUrl} alt={it.name} className="w-full h-full object-contain" />
                      ) : it.status === "failed" ? (
                        <X className="w-5 h-5 text-destructive" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "review" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {readyCount} item{readyCount === 1 ? "" : "s"} ready
                </p>
                <p className="text-[11px] text-muted-foreground">Tap to deselect items you don't want.</p>
              </div>
              <span className="text-xs font-semibold text-accent">{selectedCount} selected</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {items.map((it) => {
                const isReady = it.status === "ready";
                const isFailed = it.status === "failed";
                return (
                  <button
                    key={it.id}
                    onClick={() => toggleItem(it.id)}
                    disabled={!isReady}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                      it.selected && isReady
                        ? "border-accent bg-card"
                        : isFailed
                        ? "border-destructive/30 bg-card opacity-60"
                        : "border-border bg-card opacity-70"
                    }`}
                  >
                    <div className="aspect-square bg-white dark:bg-neutral-800 flex items-center justify-center">
                      {isReady && it.cleanImageUrl ? (
                        <img src={it.cleanImageUrl} alt={it.name} className="w-full h-full object-contain" />
                      ) : (
                        <X className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-semibold text-foreground line-clamp-1">{it.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {it.category} • {it.color}
                      </p>
                      {it.estimated_price_nzd ? (
                        <p className="text-[10px] text-accent font-semibold mt-0.5">${Math.round(it.estimated_price_nzd)} NZD</p>
                      ) : null}
                    </div>
                    {it.selected && isReady && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-accent-foreground" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold">
                        Failed
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={reset} disabled={adding}>
                Start over
              </Button>
              <Button
                className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleAddSelected}
                disabled={adding || selectedCount === 0}
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Adding…
                  </>
                ) : (
                  `Add ${selectedCount} to wardrobe`
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
