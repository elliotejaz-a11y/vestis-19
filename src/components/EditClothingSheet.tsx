import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";

const COLORS = ["Black", "White", "Navy", "Beige", "Brown", "Red", "Blue", "Green", "Pink", "Gray", "Burgundy", "Olive", "Cream", "Tan", "Charcoal"];
const FABRICS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Leather", "Cashmere", "Suede", "Knit", "Chiffon", "Velvet", "Nylon", "Canvas"];

interface Props {
  item: ClothingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: ClothingItem) => void;
}

export function EditClothingSheet({ item, open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "");
  const [color, setColor] = useState(item?.color || "");
  const [fabric, setFabric] = useState(item?.fabric || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [estimatedPrice, setEstimatedPrice] = useState(item?.estimatedPrice?.toString() || "");

  // Sync state when item changes
  if (item && name === "" && item.name !== "") {
    setName(item.name);
    setCategory(item.category);
    setColor(item.color);
    setFabric(item.fabric);
    setNotes(item.notes);
    setEstimatedPrice(item.estimatedPrice?.toString() || "");
  }

  const handleSave = () => {
    if (!item || !name || !category) return;
    const priceNum = estimatedPrice ? parseFloat(estimatedPrice) : undefined;
    onSave({ ...item, name, category, color, fabric, notes, estimatedPrice: priceNum });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) { setName(""); setCategory(""); setColor(""); setFabric(""); setNotes(""); setEstimatedPrice(""); }
      onOpenChange(o);
    }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Edit Item</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {item && (
            <div className="rounded-2xl overflow-hidden bg-muted">
              <img src={item.imageUrl} alt={item.name} className="w-full h-48 object-contain bg-white" />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl bg-card" />
            </div>
            <div className="grid grid-cols-3 gap-2">
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
                <Label className="text-xs font-medium text-muted-foreground">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="mt-1 rounded-xl bg-card text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
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
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 rounded-xl bg-card text-sm min-h-[60px]" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Vestis Price (NZD)</Label>
            <Input
              type="number"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="e.g. 120"
              className="mt-1 rounded-xl bg-card"
            />
          </div>

          <Button onClick={handleSave} disabled={!name || !category} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90">
            <Sparkles className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
