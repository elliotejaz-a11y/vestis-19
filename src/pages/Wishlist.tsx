import { useState, useEffect, useCallback } from "react";
import { Plus, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AddWishlistSheet } from "@/components/AddWishlistSheet";
import { WishlistDetailSheet } from "@/components/WishlistDetailSheet";
import { formatPrice } from "@/lib/currency";

export interface WishlistItem {
  id: string;
  name: string;
  image_url: string;
  category: string;
  color: string;
  fabric: string;
  size: string;
  brand: string;
  estimated_price: number | null;
  notes: string;
  created_at: string;
}

export default function Wishlist() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<WishlistItem | null>(null);
  const currency = profile?.currency_preference || "NZD";

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as WishlistItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (item: Omit<WishlistItem, "id" | "created_at">) => {
    if (!user) return;
    const { error } = await supabase.from("wishlist_items").insert({ ...item, user_id: user.id });
    if (error) {
      toast({ title: "Failed to add item", variant: "destructive" });
    } else {
      toast({ title: "Added to wishlist ✨" });
      fetchItems();
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDetailItem(null);
    toast({ title: "Removed from wishlist" });
  };

  const handleUpdate = async (updated: WishlistItem) => {
    const { error } = await supabase.from("wishlist_items").update({
      name: updated.name,
      image_url: updated.image_url,
      category: updated.category,
      color: updated.color,
      fabric: updated.fabric,
      size: updated.size,
      brand: updated.brand,
      estimated_price: updated.estimated_price,
      notes: updated.notes,
    }).eq("id", updated.id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setDetailItem(null);
      toast({ title: "Item updated" });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wishlist</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{items.length} items</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Heart className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Your wishlist is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
            Add items you want by tapping the + button below
          </p>
          <AddWishlistSheet onAdd={handleAdd}>
            <button className="mt-4 px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </AddWishlistSheet>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300 text-left"
            >
              <div className="aspect-[3/4] bg-white dark:bg-neutral-800">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Heart className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
                {item.estimated_price != null && item.estimated_price > 0 && (
                  <p className="text-xs font-bold text-accent mt-0.5">{formatPrice(item.estimated_price, currency)} {currency}</p>
                )}
                {item.brand && (
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{item.brand}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <AddWishlistSheet onAdd={handleAdd}>
        <button className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </AddWishlistSheet>

      <WishlistDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        onRemove={handleRemove}
        onUpdate={handleUpdate}
        currency={currency}
      />
    </div>
  );
}
