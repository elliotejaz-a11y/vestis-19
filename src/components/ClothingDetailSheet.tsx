import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ClothingItem } from "@/types/wardrobe";
import { EditClothingSheet } from "@/components/EditClothingSheet";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Pencil, DollarSign, Tag, Palette, Shirt, StickyNote, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/currency";

interface Props {
  item: ClothingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: ClothingItem) => void;
  onRemove?: (id: string) => void;
}

export function ClothingDetailSheet({ item, open, onOpenChange, onSave, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { profile } = useAuth();
  const currency = profile?.currency_preference || "NZD";

  if (!item) return null;

  if (editing) {
    return (
      <EditClothingSheet
        item={item}
        open={true}
        onOpenChange={(o) => { if (!o) setEditing(false); }}
        onSave={(updated) => { onSave(updated); setEditing(false); }}
      />
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold tracking-tight">{item.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Image with front/back toggle */}
            <div className="relative rounded-2xl overflow-hidden bg-white">
              <img
                src={showBack && item.backImageUrl ? item.backImageUrl : item.imageUrl}
                alt={item.name}
                className="w-full h-56 object-contain"
              />
              {item.backImageUrl && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    onClick={() => setShowBack(false)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${!showBack ? "bg-accent text-accent-foreground" : "bg-background/80 backdrop-blur text-foreground"}`}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setShowBack(true)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${showBack ? "bg-accent text-accent-foreground" : "bg-background/80 backdrop-blur text-foreground"}`}
                  >
                    Back
                  </button>
                </div>
              )}
              {!item.backImageUrl && (
                <div className="absolute bottom-2 right-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-background/80 backdrop-blur text-muted-foreground">
                    <ImageIcon className="w-3 h-3 inline mr-1" />No back image
                  </span>
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Category</p>
                  <p className="text-xs font-medium text-foreground capitalize">{item.category}</p>
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Color</p>
                  <p className="text-xs font-medium text-foreground">{item.color}</p>
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Fabric</p>
                  <p className="text-xs font-medium text-foreground">{item.fabric}</p>
                </div>
              </div>
              {item.estimatedPrice && (
                <div className="bg-accent/10 rounded-xl p-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Vestis Price</p>
                    <p className="text-xs font-bold text-accent">{formatPrice(item.estimatedPrice, currency)} {currency}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-medium">{tag}</span>
                ))}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="bg-card rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Notes</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{item.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setEditing(true)}
                className="flex-1 h-11 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
              >
                <Pencil className="w-4 h-4 mr-2" /> Edit Item
              </Button>
              {onRemove && (
                <Button
                  variant="outline"
                  onClick={() => setShowDelete(true)}
                  className="h-11 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => { onRemove?.(item.id); setShowDelete(false); onOpenChange(false); }}
      />
    </>
  );
}
