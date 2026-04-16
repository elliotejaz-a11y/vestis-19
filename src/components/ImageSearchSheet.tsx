import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClothingItem } from "@/types/wardrobe";
import { processClothingImage } from "@/lib/image-processing";

interface SearchResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => void;
  children: React.ReactNode;
}

export function ImageSearchSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    abortRef.current?.abort();
    setSearching(true);
    setResults([]);
    setSelectedUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("search-clothing-images", {
        body: { query: query.trim() },
      });

      if (error) throw error;
      setResults(data?.images || []);
      if (!data?.images?.length) {
        toast({ title: "No results found", description: "Try a different search term." });
      }
    } catch (err) {
      console.error("Image search failed:", err);
      toast({ title: "Search failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectImage = async (result: SearchResult) => {
    setSelectedUrl(result.url);
    setProcessing(true);

    try {
      // Fetch the image
      const response = await fetch(result.url);
      if (!response.ok) throw new Error("Failed to download image");
      const blob = await response.blob();

      // Run background removal
      const file = new File([blob], "search-image.png", { type: blob.type || "image/png" });
      let cleanBlob: Blob;
      try {
        cleanBlob = await processClothingImage(file);
      } catch {
        cleanBlob = file;
      }

      const cleanUrl = URL.createObjectURL(cleanBlob);

      // Get base64 for processing
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = reader.result as string;
          resolve(r.includes(",") ? r.split(",")[1] : r);
        };
        reader.onerror = reject;
        reader.readAsDataURL(cleanBlob);
      });

      // Run AI analysis
      let analysisData: any = null;
      try {
        // Resize for analysis
        const resizedBlob = await resizeForAnalysis(cleanBlob, 1024);
        const analysisBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const r = reader.result as string;
            resolve(r.includes(",") ? r.split(",")[1] : r);
          };
          reader.onerror = reject;
          reader.readAsDataURL(new File([resizedBlob], "analysis.jpg", { type: "image/jpeg" }));
        });

        const { data, error } = await supabase.functions.invoke("analyze-clothing", {
          body: { imageBase64: analysisBase64 },
        });
        if (!error && data) analysisData = data;
      } catch (err) {
        console.warn("AI analysis failed for searched image:", err);
      }

      const item: ClothingItem = {
        id: crypto.randomUUID(),
        name: analysisData?.name || result.title || "Searched Item",
        category: analysisData?.category || "tops",
        color: analysisData?.color || "",
        fabric: analysisData?.fabric || "",
        imageUrl: cleanUrl,
        tags: analysisData?.style_tags || [],
        notes: `Source: ${result.source}`,
        addedAt: new Date(),
        estimatedPrice: analysisData?.estimated_price_nzd,
      };

      onAdd(item, { runBackgroundRemoval: false, imageBase64ForProcessing: base64 });

      toast({
        title: "Item added ✨",
        description: `${item.name} has been added to your wardrobe.`,
      });

      setOpen(false);
      setQuery("");
      setResults([]);
      setSelectedUrl(null);
    } catch (err) {
      console.error("Failed to process searched image:", err);
      toast({
        title: "Failed to add image",
        description: "The image couldn't be downloaded. Try another one.",
        variant: "destructive",
      });
      setSelectedUrl(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setResults([]); setSelectedUrl(null); } }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: "6rem", zIndex: 10000 }}>
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Search Clothing Images</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Black Nike running shorts"
              className="flex-1 rounded-xl bg-card"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!query.trim() || searching}
              size="icon"
              className="rounded-xl shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          {/* Processing overlay */}
          {processing && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin" />
              </div>
              <p className="text-sm font-medium text-foreground">Processing image…</p>
              <p className="text-[11px] text-muted-foreground">Removing background & analysing</p>
            </div>
          )}

          {/* Results grid */}
          {!processing && results.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectImage(result)}
                  disabled={processing}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                    selectedUrl === result.url
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {selectedUrl === result.url && (
                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-accent" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!processing && !searching && results.length === 0 && (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Search for any clothing item</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                e.g. "white Nike Air Force 1" or "blue linen shirt"
              </p>
            </div>
          )}

          {/* Searching state */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Searching for images…</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function resizeForAnalysis(blob: Blob, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
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
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.8
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
