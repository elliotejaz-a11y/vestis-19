import { Outfit } from "@/types/wardrobe";
import { Sparkles, Lightbulb, Bookmark, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  outfit: Outfit;
  onSave?: (id: string, saved: boolean) => void;
  onDelete?: (id: string) => void;
  onChat?: (outfit: Outfit) => void;
}

export function OutfitCard({ outfit, onSave, onDelete, onChat }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{outfit.occasion}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {onChat && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChat(outfit)}>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          {onSave && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSave(outfit.id, !outfit.saved)}>
              <Bookmark className={cn("w-4 h-4", outfit.saved ? "fill-accent text-accent" : "text-muted-foreground")} />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(outfit.id)}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-20">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">{item.name}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{outfit.reasoning}</p>
      {outfit.styleTips && (
        <div className="flex items-start gap-2 bg-accent/10 rounded-xl p-2.5">
          <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-foreground leading-relaxed">{outfit.styleTips}</p>
        </div>
      )}
    </div>
  );
}
