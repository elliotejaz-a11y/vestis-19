import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, RotateCw, RefreshCw, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { processClothingImage } from "@/lib/image-processing";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { ColorPicker, parseColors, joinColors } from "@/components/ColorPicker";

const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Leather", "Cashmere", "Suede", "Knit", "Chiffon", "Velvet", "Nylon", "Canvas", "Metal", "Silver", "Gold", "Stainless Steel", "Titanium", "Platinum", "Rubber", "Satin", "Faux Leather", "Gore-Tex", "Mesh"];

interface Props {
  item: ClothingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: ClothingItem) => void;
}

export function EditClothingSheet({ item, open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "");
  const [colors, setColors] = useState<string[]>(parseColors(item?.color || ""));
  const [fabric, setFabric] = useState(item?.fabric || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [estimatedPrice, setEstimatedPrice] = useState(item?.estimatedPrice?.toString() || "");
  const [priceEnabled, setPriceEnabled] = useState(item?.estimatedPrice != null);
  const [isPrivate, setIsPrivate] = useState(item?.isPrivate || false);
  const [rotation, setRotation] = useState(0);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Sync state when item changes
  if (item && name === "" && item.name !== "") {
    setName(item.name);
    setCategory(item.category);
    setColors(parseColors(item.color));
    setFabric(item.fabric);
    setNotes(item.notes);
    setEstimatedPrice(item.estimatedPrice?.toString() || "");
    setPriceEnabled(item.estimatedPrice != null);
    setIsPrivate(item.isPrivate || false);
    setRotation(0);
    setNewImage(null);
    setNewPreview(null);
  }

  const handleRetake = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setNewPreview(URL.createObjectURL(file));
      setRotation(0);
    }
  };

  const handleSave = async () => {
    if (!item || !name || !category) return;
    let imageUrl = item.imageUrl;

    if (newImage && user) {
      setUploading(true);
      try {
        const processed = await processClothingImage(newImage);
        const ext = newImage.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("clothing-images").upload(path, processed);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.error("Image upload failed", err);
      } finally {
        setUploading(false);
      }
    }

    const priceNum = priceEnabled && estimatedPrice ? parseFloat(estimatedPrice) : (priceEnabled ? 0 : undefined);
    onSave({ ...item, name, category, color: joinColors(colors), fabric, notes, estimatedPrice: priceNum, isPrivate, imageUrl });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) { setName(""); setCategory(""); setColors([]); setFabric(""); setNotes(""); setEstimatedPrice(""); setPriceEnabled(false); setIsPrivate(false); setRotation(0); setNewImage(null); setNewPreview(null); }
      onOpenChange(o);
    }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Edit Item</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {item && (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img
                src={newPreview || item.imageUrl}
                alt={item.name}
                className="w-full h-48 object-contain bg-white dark:bg-neutral-800 transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <label className="bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" capture="environment" onChange={handleRetake} className="hidden" />
                </label>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fabric</Label>
                <Select value={fabric} onValueChange={setFabric}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue /></SelectTrigger>
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 rounded-xl bg-card text-sm min-h-[60px]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Vestis Price</Label>
              <Switch
                checked={priceEnabled}
                onCheckedChange={(checked) => {
                  setPriceEnabled(checked);
                  if (!checked) setEstimatedPrice("");
                  else setEstimatedPrice(item?.estimatedPrice?.toString() || "0");
                }}
              />
            </div>
            {priceEnabled && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="e.g. 120"
                  className="rounded-xl bg-card flex-1"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40">
            <div>
              <Label className="text-xs font-medium text-foreground">Hide from friends</Label>
              <p className="text-[10px] text-muted-foreground">This item won't be visible to friends</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <Button onClick={handleSave} disabled={!name || !category} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90">
            <Sparkles className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
