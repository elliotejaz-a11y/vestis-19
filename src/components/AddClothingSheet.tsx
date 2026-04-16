import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Loader2, DollarSign, RotateCw, RefreshCw, Search } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker, joinColors } from "@/components/ColorPicker";
import { isAllowedWardrobeImageType, isAllowedWardrobeImageSize } from "@/lib/wardrobeImageProcessing";
import { processClothingImage } from "@/lib/image-processing";

const FABRICS = ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"];

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => void;
  children: React.ReactNode;
}

export function AddClothingSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | undefined>();
  const [priceInput, setPriceInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Image search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ url: string; thumbnail: string; title: string; source: string }>>([]);
  const [searching, setSearching] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resizeImageForAnalysis = (blob: Blob, maxDim: number): Promise<Blob> => {
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
        // White background to flatten transparency for JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.8
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  };


  const imageUrlToBase64 = async (url: string): Promise<string | undefined> => {
    if (url.startsWith("data:")) return url.split(",")[1];
    if (url.startsWith("blob:")) {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(",") ? result.split(",")[1] : "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return undefined;
  };

  const handleImageSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-clothing-images", {
        body: { query: searchQuery.trim() },
      });
      if (error) throw error;
      setSearchResults(data?.images || []);
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

  const handleSelectSearchImage = async (imgUrl: string) => {
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery("");
    setRemovingBg(true);
    setImageUrl(imgUrl);

    try {
      const response = await fetch(imgUrl);
      if (!response.ok) throw new Error("Failed to download image");
      const blob = await response.blob();
      const file = new File([blob], "search-image.png", { type: blob.type || "image/png" });

      let cleanBlob: Blob;
      try {
        cleanBlob = await processClothingImage(file);
        setImageUrl(URL.createObjectURL(cleanBlob));
      } catch {
        cleanBlob = file;
        setImageUrl(URL.createObjectURL(file));
      }
      setRemovingBg(false);

      // Run AI analysis
      setAnalyzing(true);
      try {
        const resizedBlob = await resizeImageForAnalysis(cleanBlob, 1024);
        const base64 = await fileToBase64(new File([resizedBlob], "search.jpg", { type: "image/jpeg" }));
        const { data, error } = await supabase.functions.invoke("analyze-clothing", {
          body: { imageBase64: base64 },
        });
        if (!error && data) {
          setName(data.name || "");
          setCategory(data.category || "");
          setColors(data.color ? [data.color] : []);
          setFabric(data.fabric || "");
          setTags(data.style_tags || []);
          if (data.estimated_price_nzd) setEstimatedPrice(data.estimated_price_nzd);
          toast({ title: "AI Analysis Complete ✨", description: `Detected: ${data.name}` });
        }
      } catch (err) {
        console.warn("AI analysis failed for searched image:", err);
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error("Failed to process searched image:", err);
      toast({ title: "Failed to load image", description: "Try another one.", variant: "destructive" });
      setImageUrl("");
      setRemovingBg(false);
    }
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

    // Show original preview immediately
    setImageUrl(URL.createObjectURL(file));
    setRemovingBg(true);
    let cleanBlob: Blob;
    try {
      cleanBlob = await processClothingImage(file);
      setImageUrl(URL.createObjectURL(cleanBlob));
    } catch {
      cleanBlob = file;
    } finally {
      setRemovingBg(false);
    }

    setAnalyzing(true);
    try {
      // Resize image to max 1024px before sending to AI to stay under 10MB limit
      const resizedBlob = await resizeImageForAnalysis(cleanBlob, 1024);
      const base64 = await fileToBase64(new File([resizedBlob], file.name, { type: "image/jpeg" }));
      const { data, error } = await supabase.functions.invoke("analyze-clothing", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setCategory(data.category || "");
        setColors(data.color ? [data.color] : []);
        setFabric(data.fabric || "");
        setTags(data.style_tags || []);
        if (data.estimated_price_nzd) setEstimatedPrice(data.estimated_price_nzd);
        toast({
          title: "AI Analysis Complete ✨",
          description: `Detected: ${data.name}${data.estimated_price_nzd ? ` — Vestis Price: $${data.estimated_price_nzd} NZD` : ""}`,
        });
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
      toast({
        title: "AI analysis failed",
        description: "You can still fill in the details manually.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackImageUrl(URL.createObjectURL(file));
    toast({ title: "Back image added" });
  };

  const handleSave = async () => {
    if (!imageUrl || !name || !category) return;
    const color = joinColors(colors);
    const isFileSourced = imageUrl.startsWith("blob:") || imageUrl.startsWith("data:");
    let imageBase64ForProcessing: string | undefined;
    if (isFileSourced) {
      try {
        imageBase64ForProcessing = await imageUrlToBase64(imageUrl);
      } catch (e) {
        console.warn("Could not get base64 for background removal:", e);
      }
    }
    onAdd(
      {
        id: crypto.randomUUID(),
        name,
        category,
        color,
        fabric,
        imageUrl,
        backImageUrl: backImageUrl || undefined,
        tags: [...tags, ...colors.map(c => c.toLowerCase()), fabric.toLowerCase(), category].filter(Boolean),
        notes,
        addedAt: new Date(),
        estimatedPrice,
      },
      { runBackgroundRemoval: isFileSourced, imageBase64ForProcessing }
    );
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setImageUrl(""); setBackImageUrl(""); setName(""); setCategory(""); setColors([]); setFabric("");
    setSize(""); setPrivacy("public"); setTags([]); setNotes(""); setEstimatedPrice(undefined); setPriceInput(""); setRotation(0);
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Add to Wardrobe</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {!imageUrl ? (
            <>
              {!showSearch ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-xs font-medium">Upload Photo</span>
                  </button>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="flex-1 h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Search className="w-8 h-8" />
                    <span className="text-xs font-medium">Search Online</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Back
                    </button>
                    <span className="text-sm font-semibold text-foreground">Search Clothing Images</span>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleImageSearch(); }} className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Black Nike running shorts"
                      className="flex-1 rounded-xl bg-card"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      disabled={!searchQuery.trim() || searching}
                      size="icon"
                      className="rounded-xl shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </form>
                  {searching && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                  )}
                  {!searching && searchResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSearchImage(result.url)}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-accent transition-all hover:scale-[1.02]"
                        >
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <div className="text-center py-6">
                      <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Search for any clothing item</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">e.g. "white Nike Air Force 1" or "blue linen shirt"</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt="Preview"
                className={`w-full h-48 object-contain bg-white dark:bg-neutral-800 transition-all duration-300 ${removingBg ? 'blur-[2px] scale-[1.02]' : ''} ${!removingBg && !analyzing ? 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]' : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              {!removingBg && !analyzing && (
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { resetForm(); }}
                    className="bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {removingBg && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin" />
                    <Sparkles className="w-5 h-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Removing Background</p>
                    <p className="text-[11px] text-white/60 mt-1">This may take a moment…</p>
                  </div>
                </div>
              )}
              {!removingBg && analyzing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin" />
                    <Sparkles className="w-5 h-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">AI Analyzing Clothing</p>
                    <p className="text-[11px] text-white/60 mt-1">
                      Detecting category, color, fabric & value…
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Back image upload */}
          {imageUrl && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Back of clothing (optional)</p>
              {!backImageUrl ? (
                <button
                  onClick={() => backFileRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Add back image</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-white dark:bg-neutral-800 h-24">
                  <img src={backImageUrl} alt="Back" className="w-full h-full object-contain" />
                  <button onClick={() => setBackImageUrl("")} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center text-foreground text-xs">✕</button>
                </div>
              )}
              <input ref={backFileRef} type="file" accept="image/*" className="hidden" onChange={handleBackFile} />
              <p className="text-[10px] text-muted-foreground mt-1">AI will assume plain fabric if no back image is added</p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-medium">{tag}</span>
              ))}
            </div>
          )}

          {estimatedPrice !== undefined && (
            <div className="flex items-center justify-between bg-accent/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-foreground">Vestis Price</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent">${estimatedPrice.toFixed(0)}</span>
                <button
                  onClick={() => setEstimatedPrice(undefined)}
                  className="text-[10px] text-muted-foreground underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {estimatedPrice === undefined && imageUrl && !analyzing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Price (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Add a value..."
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="rounded-xl bg-card flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  disabled={!priceInput || isNaN(parseFloat(priceInput)) || parseFloat(priceInput) <= 0}
                  onClick={() => {
                    const val = parseFloat(priceInput);
                    if (!isNaN(val) && val > 0) {
                      setEstimatedPrice(val);
                      setPriceInput("");
                    }
                  }}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  ✓
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue Linen Shirt" className="mt-1 rounded-xl bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fabric</Label>
                <Select value={fabric} onValueChange={setFabric}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue placeholder="Fabric" /></SelectTrigger>
                  <SelectContent>
                    {FABRICS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Colours</Label>
              <div className="mt-1.5">
                <ColorPicker selected={colors} onChange={setColors} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Super comfy, runs a size small..." className="mt-1 rounded-xl bg-card text-sm min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Size</Label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, 10, 32W" className="mt-1 rounded-xl bg-card" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Privacy</Label>
              <Select value={privacy} onValueChange={setPrivacy}>
                <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Public</SelectItem>
                  <SelectItem value="friends">👥 Friends Only</SelectItem>
                  <SelectItem value="private">🔒 Only Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!imageUrl || !name || !category || analyzing}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Save to Wardrobe
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
