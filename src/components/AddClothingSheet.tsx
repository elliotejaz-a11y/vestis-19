import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Sparkles, Loader2, ImageOff } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onAdd: (item: ClothingItem) => void;
  children: React.ReactNode;
}

const COLORS = ["Black", "White", "Navy", "Beige", "Brown", "Red", "Blue", "Green", "Pink", "Gray", "Burgundy", "Olive", "Cream", "Tan", "Charcoal"];
const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Leather", "Cashmere", "Suede", "Knit", "Chiffon", "Velvet", "Nylon", "Canvas"];

export function AddClothingSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [fabric, setFabric] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
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

  const removeBackground = async (base64: string): Promise<string> => {
    setRemovingBg(true);
    try {
      const { data, error } = await supabase.functions.invoke("remove-background", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      if (data?.imageBase64 && !data.fallback) {
        return data.imageBase64;
      }
    } catch (err) {
      console.error("Background removal failed:", err);
    } finally {
      setRemovingBg(false);
    }
    return base64;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      
      // Remove background first
      const cleanBase64 = await removeBackground(base64);
      setImageUrl(`data:image/png;base64,${cleanBase64}`);

      // Analyze clothing with AI
      const { data, error } = await supabase.functions.invoke("analyze-clothing", {
        body: { imageBase64: cleanBase64 },
      });

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setCategory(data.category || "");
        setColor(data.color || "");
        setFabric(data.fabric || "");
        setTags(data.style_tags || []);
        toast({
          title: "AI Analysis Complete ✨",
          description: `Detected: ${data.name}`,
        });
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
      // If we don't have an image URL yet, set original
      if (!imageUrl) {
        const file2 = e.target.files?.[0];
        if (file2) setImageUrl(URL.createObjectURL(file2));
      }
      toast({
        title: "AI analysis failed",
        description: "You can still fill in the details manually.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
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
      tags: [...tags, color.toLowerCase(), fabric.toLowerCase(), category].filter(Boolean),
      notes,
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
    setTags([]);
    setNotes("");
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
                <Upload className="w-8 h-8" />
                <span className="text-xs font-medium">Upload Photo</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-contain bg-white" />
              {(analyzing || removingBg) && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {removingBg ? (
                      <><ImageOff className="w-4 h-4 text-accent" /> Removing background...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 text-accent" /> AI is analyzing your clothing...</>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Style tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-medium">
                  {tag}
                </span>
              ))}
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
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Super comfy, runs a size small, great for layering..."
                className="mt-1 rounded-xl bg-card text-sm min-h-[60px]"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!imageUrl || !name || !category || analyzing || removingBg}
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
