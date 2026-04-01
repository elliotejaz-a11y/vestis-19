import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { DollarSign, Tag, Palette, Shirt, StickyNote, Ruler, Store } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import type { WishlistItem } from "@/pages/Wishlist";

interface Props {
  item: WishlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
  onUpdate: (item: WishlistItem) => void;
  currency: string;
}

export function WishlistDetailSheet({ item, open, onOpenChange, onRemove, currency }: Props) {
  const [showDelete, setShowDelete] = useState(false);

  if (!item) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
          <SheetHeader>
            <SheetTitle className="text-lg font-bold tracking-tight">{item.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {item.image_url && (
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-800">
                <img src={item.image_url} alt={item.name} className="w-full h-56 object-contain" />
              </div>
            )}

            {/* Price prominent */}
            {item.estimated_price != null && item.estimated_price > 0 && (
              <div className="bg-accent/10 rounded-xl p-4 flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Price</p>
                  <p className="text-lg font-bold text-accent">{formatPrice(item.estimated_price, currency)} {currency}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {item.brand && (
                <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                  <Store className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Brand</p>
                    <p className="text-xs font-medium text-foreground">{item.brand}</p>
                  </div>
                </div>
              )}
              {item.category && (
                <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Category</p>
                    <p className="text-xs font-medium text-foreground capitalize">{item.category}</p>
                  </div>
                </div>
              )}
              {item.color && (
                <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Color</p>
                    <p className="text-xs font-medium text-foreground">{item.color}</p>
                  </div>
                </div>
              )}
              {item.fabric && (
                <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Fabric</p>
                    <p className="text-xs font-medium text-foreground">{item.fabric}</p>
                  </div>
                </div>
              )}
              {item.size && (
                <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Size</p>
                    <p className="text-xs font-medium text-foreground">{item.size}</p>
                  </div>
                </div>
              )}
            </div>

            {item.notes && (
              <div className="bg-card rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Notes</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{item.notes}</p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setShowDelete(true)}
              className="w-full h-11 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Remove from Wishlist
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => { onRemove(item.id); setShowDelete(false); }}
      />
    </>
  );
}
