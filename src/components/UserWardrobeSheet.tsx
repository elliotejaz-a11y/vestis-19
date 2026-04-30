import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { batchResolveSignedClothingImageFields, isStoragePath } from "@/lib/storage";
import { ClothingItem } from "@/types/wardrobe";
import { ClothingDetailSheet } from "@/components/ClothingDetailSheet";

interface UserWardrobeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
}

export default function UserWardrobeSheet({ open, onOpenChange, userId, displayName }: UserWardrobeSheetProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clothing_items")
        .select("id, name, image_url, back_image_url, category, color, fabric, tags, notes, estimated_price, created_at")
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      const raw: ClothingItem[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        color: r.color,
        fabric: r.fabric || "",
        imageUrl: isStoragePath(r.image_url) ? "" : (r.image_url || ""),
        imagePath: isStoragePath(r.image_url) ? r.image_url : undefined,
        backImageUrl: r.back_image_url && !isStoragePath(r.back_image_url) ? r.back_image_url : undefined,
        backImagePath: isStoragePath(r.back_image_url) ? r.back_image_url : undefined,
        tags: r.tags || [],
        notes: r.notes || "",
        addedAt: new Date(r.created_at),
        estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
        isPrivate: false,
      }));

      const resolved = await batchResolveSignedClothingImageFields(raw);
      setItems(resolved);
      setLoading(false);
    };
    load();
  }, [open, userId]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-24">
          <SheetHeader>
            <SheetTitle className="text-base">{displayName}'s Wardrobe</SheetTitle>
          </SheetHeader>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">No visible items</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="rounded-xl overflow-hidden bg-card border border-border/40 text-left active:scale-95 transition-transform"
                >
                  <div className="aspect-square">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ClothingDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(o) => { if (!o) setSelectedItem(null); }}
        readOnly
      />
    </>
  );
}
