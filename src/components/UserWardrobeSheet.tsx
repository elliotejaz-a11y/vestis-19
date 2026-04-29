import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { resolveSignedClothingImageFields, isStoragePath } from "@/lib/storage";

interface UserWardrobeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
}

interface ClothingItem {
  id: string;
  name: string;
  image_url: string;
  image_path?: string;
  category: string;
  color: string;
}

export default function UserWardrobeSheet({ open, onOpenChange, userId, displayName }: UserWardrobeSheetProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clothing_items")
        .select("id, name, image_url, category, color")
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("created_at", { ascending: false });
      const resolvedItems = await Promise.all(
        ((data || []) as ClothingItem[]).map((item) =>
          resolveSignedClothingImageFields({
            ...item,
            imageUrl: isStoragePath(item.image_url) ? "" : item.image_url,
            imagePath: isStoragePath(item.image_url) ? item.image_url : undefined,
          }).then((resolved) => ({
            ...item,
            image_url: resolved.imageUrl,
            image_path: resolved.imagePath,
          }))
        )
      );
      setItems(resolvedItems);
      setLoading(false);
    };
    load();
  }, [open, userId]);

  return (
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
              <div key={item.id} className="rounded-xl overflow-hidden bg-card border border-border/40">
                <div className="aspect-square">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground capitalize">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
