import { useState } from "react";
import { Outfit, ClothingItem } from "@/types/wardrobe";
import { Sparkles, Lightbulb, Bookmark, MessageCircle, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FitPicSheet } from "@/components/FitPicSheet";
import { SaveOutfitDialog } from "@/components/SaveOutfitDialog";
import { OutfitDetailSheet } from "@/components/OutfitDetailSheet";
import { sortItemsHeadToToe, ITEM_MAX_SIZE } from "@/lib/outfit-display";

interface Props {
  outfit: Outfit;
  onSave?: (id: string, saved: boolean, name?: string, description?: string) => void;
  onDelete?: (id: string) => void;
  onChat?: (outfit: Outfit) => void;
  compact?: boolean;
}

export function OutfitCard({ outfit, onSave, onDelete, onChat, compact }: Props) {
  const sorted = sortItemsHeadToToe(outfit.items);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outfit.saved) {
      onSave?.(outfit.id, false);
    } else {
      setSaveDialogOpen(true);
    }
  };

  const handleSaveConfirm = (name: string, description: string) => {
    onSave?.(outfit.id, true, name || undefined, description || undefined);
    setSaveDialogOpen(false);
  };

  return (
    <>
      <div
        className="rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setDetailOpen(true)}
      >
        {/* Head-to-toe outfit display */}
        <div className="bg-white dark:bg-neutral-800 p-4 h-64 overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full gap-y-1">
            {sorted.map((item) => {
              const sizeClass = ITEM_MAX_SIZE[item.category] || "max-w-24";
              return (
                <div key={item.id} className={cn("flex-shrink min-h-0", sizeClass)}>
                  <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain drop-shadow-sm mx-auto" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Info section */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {outfit.name ? (
                <p className="text-xs font-semibold text-foreground truncate">{outfit.name}</p>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">{outfit.occasion}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {onChat && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChat(outfit)}>
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
              <FitPicSheet outfitId={outfit.id}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </FitPicSheet>
              {onSave && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBookmarkClick}>
                  <Bookmark className={cn("w-3.5 h-3.5", outfit.saved ? "fill-accent text-accent" : "text-muted-foreground")} />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-90 transition-transform" onClick={() => onDelete(outfit.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {!compact && (
            <>
              {outfit.description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1">{outfit.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{outfit.reasoning}</p>
              {outfit.styleTips && (
                <div className="flex items-start gap-1.5 bg-accent/10 rounded-xl p-2">
                  <Lightbulb className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-foreground leading-relaxed">{outfit.styleTips}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <OutfitDetailSheet outfit={outfit} open={detailOpen} onOpenChange={setDetailOpen} />

      <SaveOutfitDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onConfirm={handleSaveConfirm}
        defaultName={outfit.occasion}
      />
    </>
  );
}