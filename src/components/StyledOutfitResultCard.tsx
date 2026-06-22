import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OutfitCollagePreview } from '@/components/OutfitCollagePreview';
import type { StyledOutfitResult } from '@/types/wardrobe';
import type { ClothingItem } from '@/types/wardrobe';

interface Props {
  result: StyledOutfitResult;
  onTryAgain: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
}

export function StyledOutfitResultCard({ result, onTryAgain, onSave, isSaving, isSaved }: Props) {
  const { outfitName, styleNote, items } = result;
  const { anchor, top, bottom, outerwear, shoes, accessories } = items;

  const handleSave = async () => {
    try { await onSave(); } catch { /* surfaced by parent toast */ }
  };

  // Flatten to array for the collage, deduped
  const allItems: ClothingItem[] = [];
  const seen = new Set<string>();
  const add = (item: ClothingItem | undefined) => {
    if (item && !seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
  };
  add(anchor);
  add(top);
  add(bottom);
  add(outerwear);
  add(shoes);
  (accessories || []).forEach(add);

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm">
      {/* Flat-lay collage */}
      <div className="bg-muted/40 p-4">
        <OutfitCollagePreview
          items={allItems}
          canvasClassName="h-[280px] bg-card"
          anchorItemId={anchor.id}
        />
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate">{outfitName}</p>
        </div>

        {styleNote && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
            {styleNote}
          </p>
        )}

        {/* Anchor legend */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ boxShadow: '0 0 0 2px #8B1A2E' }}
          />
          Anchor: {anchor.name}
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-border text-foreground"
            onClick={onTryAgain}
            disabled={isSaving}
          >
            Try Again
          </Button>
          <Button
            className={cn(
              'flex-1 rounded-xl font-medium',
              isSaved
                ? 'bg-green-700 text-white hover:bg-green-700'
                : 'bg-accent text-accent-foreground hover:bg-accent/90',
            )}
            onClick={handleSave}
            disabled={isSaving || isSaved}
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving...</>
            ) : isSaved ? 'Saved ✓' : 'Save Outfit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
