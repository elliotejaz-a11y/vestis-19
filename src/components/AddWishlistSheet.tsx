import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Search, Loader2, X } from "lucide-react";
import { CATEGORIES } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker, joinColors } from "@/components/ColorPicker";
import { isAllowedWardrobeImageType, isAllowedWardrobeImageSize } from "@/lib/wardrobeImageProcessing";
import type { WishlistItem } from "@/pages/Wishlist";

const FABRICS = ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"];

interface Props {
  onAdd: (item: Omit<WishlistItem, "id" | "created_at">) => void;
  children: React.ReactNode;
}

export function AddWishlistSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<{ url: string; title: string }[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleImageSearch = async () => {
    if (!imageSearchQuery.trim()) return;
    setSearchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-clothing-images", {
        body: { query: imageSearchQuery.trim() },
      });
      if (!error && data?.images) setImageSearchResults(data.images);
    } catch { /* ignore */ } finally { setSearchingImages(false); }
  };

  const handleSave = () => {
    if (!name) return;
    const price = priceInput ? parseFloat(priceInput) : null;
    onAdd({
      name,
      image_url: imageUrl,
      category,
      color: joinColors(colors),
      fabric,
      size,
      brand,
      estimated_price: price && price > 0 ? price : null,
      notes,
    });
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setImageUrl(""); setName(""); setCategory(""); setColors([]); setFabric("");
    setSize(""); setBrand(""); setNotes(""); setPriceInput("");
    setShowImageSearch(false); setImageSearchQuery(""); setImageSearchResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Add to Wishlist</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Image upload */}
          {!imageUrl ? (
            <div className="space-y-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-xs font-medium">Upload Photo</span>
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

              <button
                onClick={() => setShowImageSearch(!showImageSearch)}
                className="w-full h-11 rounded-2xl border border-border bg-card flex items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="text-xs font-medium">Search for an image online</span>
              </button>
              {showImageSearch && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={imageSearchQuery}
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      placeholder="e.g. Black Nike Air Force 1"
                      className="rounded-xl bg-card text-sm flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleImageSearch()}
                    />
                    <Button
                      onClick={handleImageSearch}
                      disabled={searchingImages || !imageSearchQuery.trim()}
                      size="icon"
                      className="rounded-xl h-10 w-10 shrink-0 bg-accent text-accent-foreground"
                    >
                      {searchingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {imageSearchResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {imageSearchResults.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setImageUrl(img.url); setShowImageSearch(false); setImageSearchResults([]); }}
                          className="aspect-square rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"
                        >
                          <img src={img.url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-contain bg-white dark:bg-neutral-800" />
              <button
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nike Air Max 90" className="mt-1 rounded-xl bg-card" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Brand</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike, Zara, Gucci" className="mt-1 rounded-xl bg-card" />
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Size</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, 10, 42" className="mt-1 rounded-xl bg-card" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Price</Label>
                <Input type="number" inputMode="numeric" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="e.g. 120" className="mt-1 rounded-xl bg-card" />
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Saw this at the mall, want for my birthday..." className="mt-1 rounded-xl bg-card text-sm min-h-[60px]" />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!name}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Add to Wishlist
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
