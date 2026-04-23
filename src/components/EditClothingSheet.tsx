import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Camera } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { ColorPicker, parseColors, joinColors } from "@/components/ColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSignedStorageUrl } from "@/lib/storage";

const FABRICS = ["Canvas", "Cashmere", "Chiffon", "Cotton", "Denim", "Faux Leather", "Gold", "Gore-Tex", "Knit", "Leather", "Linen", "Mesh", "Metal", "Nylon", "Platinum", "Polyester", "Rubber", "Satin", "Silk", "Silver", "Spandex", "Stainless Steel", "Suede", "Titanium", "Velvet", "Wool"];

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
  const [size, setSize] = useState((item as any)?.size || "");
  const [privacy, setPrivacy] = useState((item as any)?.privacy || "public");
  const [estimatedPrice, setEstimatedPrice] = useState(item?.estimatedPrice?.toString() || "");
  const [priceEnabled, setPriceEnabled] = useState(item?.estimatedPrice != null);
  const [isPrivate, setIsPrivate] = useState(item?.isPrivate || false);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newImagePath, setNewImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Sync state when item changes
  if (item && name === "" && item.name !== "") {
    setName(item.name);
    setCategory(item.category);
    setColors(parseColors(item.color));
    setFabric(item.fabric);
    setNotes(item.notes);
    setSize((item as any).size || "");
    setPrivacy((item as any).privacy || "public");
    setEstimatedPrice(item.estimatedPrice?.toString() || "");
    setPriceEnabled(item.estimatedPrice != null);
    setIsPrivate(item.isPrivate || false);
    setNewImageUrl(null);
    setNewImagePath(null);
  }

  const handleRetakePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !item) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("clothing-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const url = await getSignedStorageUrl("clothing-images", path);
      if (!url) throw new Error("Could not create image link");
      setNewImageUrl(url);
      setNewImagePath(path);
      // Update in DB immediately
      await supabase.from("clothing_items").update({ image_url: path } as any).eq("id", item.id);
      toast({ title: "Photo updated" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = () => {
    if (!item || !name || !category) return;
    const priceNum = priceEnabled && estimatedPrice ? parseFloat(estimatedPrice) : (priceEnabled ? 0 : undefined);
    onSave({
      ...item,
      name,
      category,
      color: joinColors(colors),
      fabric,
      notes,
      estimatedPrice: priceNum,
      isPrivate,
      imageUrl: newImageUrl || item.imageUrl,
      imagePath: newImagePath || item.imagePath,
      ...(size !== undefined ? { size } : {}),
      ...(privacy !== undefined ? { privacy } : {}),
    } as ClothingItem);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) { setName(""); setCategory(""); setColors([]); setFabric(""); setNotes(""); setSize(""); setPrivacy("public"); setEstimatedPrice(""); setPriceEnabled(false); setIsPrivate(false); setNewImageUrl(null); setNewImagePath(null); }
      onOpenChange(o);
    }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Edit Item</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {item && (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img src={newImageUrl || item.imageUrl} alt={item.name} className="w-full h-48 object-contain bg-white dark:bg-neutral-800" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/70 text-background text-[11px] font-medium hover:bg-foreground/80 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : "Retake Photo"}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleRetakePhoto} />
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
              <Label className="text-xs font-medium text-muted-foreground">Size</Label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, 10, 32W" className="mt-1 rounded-xl bg-card" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 rounded-xl bg-card text-sm min-h-[60px]" />
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
