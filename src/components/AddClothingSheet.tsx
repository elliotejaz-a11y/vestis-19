import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Loader2, DollarSign } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker, joinColors } from "@/components/ColorPicker";
import { isAllowedWardrobeImageType, isAllowedWardrobeImageSize } from "@/lib/wardrobeImageProcessing";

const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Leather", "Cashmere", "Suede", "Knit", "Chiffon", "Velvet", "Nylon", "Canvas", "Metal", "Silver", "Gold", "Stainless Steel", "Titanium", "Platinum", "Rubber", "Satin", "Faux Leather", "Gore-Tex", "Mesh"];

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean }) => void;
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
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | undefined>();
  const [analyzing, setAnalyzing] = useState(false);

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

    setImageUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
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

  const handleSave = () => {
    if (!imageUrl || !name || !category) return;
    const color = joinColors(colors);
    const isFileSourced = imageUrl.startsWith("blob:") || imageUrl.startsWith("data:");
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
      { runBackgroundRemoval: isFileSourced }
    );
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setImageUrl(""); setBackImageUrl(""); setName(""); setCategory(""); setColors([]); setFabric("");
    setTags([]); setNotes(""); setEstimatedPrice(undefined);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Add to Wardrobe</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {!imageUrl ? (
            <div className="flex gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-xs font-medium">Upload Photo</span>
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-contain bg-white" />
              {analyzing && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground justify-center">
                      <Sparkles className="w-4 h-4 text-accent" /> AI Analyzing Clothing
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Detecting category, color, fabric & estimating value…
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
                <div className="relative rounded-xl overflow-hidden bg-white h-24">
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
              <Input
                type="number"
                placeholder="Add a value..."
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) setEstimatedPrice(val);
                }}
                className="rounded-xl bg-card"
              />
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
