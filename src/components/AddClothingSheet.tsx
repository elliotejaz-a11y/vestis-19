import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Sparkles, Loader2 } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";

interface Props {
  onAdd: (item: ClothingItem) => void;
  children: React.ReactNode;
}

const COLORS = ["Black", "White", "Navy", "Beige", "Brown", "Red", "Blue", "Green", "Pink", "Gray"];
const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Leather", "Cashmere"];

export function AddClothingSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [fabric, setFabric] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Mock AI analysis
    setAnalyzing(true);
    setTimeout(() => {
      const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const randomFabric = FABRICS[Math.floor(Math.random() * FABRICS.length)];
      setCategory(randomCat.value);
      setColor(randomColor);
      setFabric(randomFabric);
      setName(`${randomColor} ${randomCat.label.slice(0, -1)}`);
      setAnalyzing(false);
    }, 1500);
  };

  const handleSave = () => {
    if (!imageUrl || !name || !category) return;
    onAdd({
      id: crypto.randomUUID(),
      name,
      category,
      color,
      fabric,
      imageUrl,
      tags: [color.toLowerCase(), fabric.toLowerCase(), category],
      addedAt: new Date(),
    });
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setImageUrl("");
    setName("");
    setCategory("");
    setColor("");
    setFabric("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Add to Wardrobe</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Image upload */}
          {!imageUrl ? (
            <div className="flex gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Camera className="w-8 h-8" />
                <span className="text-xs font-medium">Take Photo</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-xs font-medium">Upload</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Analyzing clothing...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue Linen Shirt" className="mt-1 rounded-xl bg-card" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fabric</Label>
                <Select value={fabric} onValueChange={setFabric}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue placeholder="Fabric" /></SelectTrigger>
                  <SelectContent>
                    {FABRICS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!imageUrl || !name || !category || analyzing}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Save to Wardrobe
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
