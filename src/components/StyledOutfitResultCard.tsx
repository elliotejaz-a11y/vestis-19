import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StyledOutfitResult, StyleDirection } from '@/types/wardrobe';
import type { ClothingItem } from '@/types/wardrobe';

interface Props {
  result: StyledOutfitResult;
  onTryAgain: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
}

const DIRECTION_LABELS: Record<StyleDirection, string> = {
  minimal_clean: 'Minimal',
  streetwear_edge: 'Street',
  smart_casual: 'Smart Casual',
  classic_tailored: 'Classic',
  relaxed_luxe: 'Relaxed Luxe',
  bold_expressive: 'Bold',
};

function ItemThumbnail({
  item,
  isAnchor,
  label,
}: {
  item: ClothingItem;
  isAnchor: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden bg-white border shadow-sm',
          isAnchor
            ? 'border-accent border-2 ring-2 ring-accent/20'
            : 'border-border/40',
          'w-full aspect-[3/4]',
        )}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl">
              {item.category === 'shoes' ? '👟' :
               item.category === 'outerwear' ? '🧥' :
               item.category === 'bottoms' ? '👖' :
               item.category === 'accessories' ? '👜' :
               item.category === 'hats' ? '🧢' : '👕'}
            </span>
          </div>
        )}
        {isAnchor && (
          <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-accent" />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center leading-tight capitalize line-clamp-2 px-0.5">
        {label}
      </p>
    </div>
  );
}

export function StyledOutfitResultCard({ result, onTryAgain, onSave, isSaving, isSaved }: Props) {
  const { outfitName, styleNote, items, styleDirection } = result;
  const { anchor, top, bottom, outerwear, shoes, accessories } = items;

  const handleSave = async () => {
    try {
      await onSave();
    } catch {
      // Error surfaced by parent via toast
    }
  };

  // Build the grid items — all unique, with labels
  type GridItem = { item: ClothingItem; label: string; isAnchor: boolean };
  const gridItems: GridItem[] = [];
  const seenIds = new Set<string>();

  const add = (item: ClothingItem | undefined, label: string, isAnchor = false) => {
    if (!item || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    gridItems.push({ item, label, isAnchor });
  };

  add(anchor, anchor.category, true);
  add(top, 'top');
  add(bottom, 'bottom');
  add(outerwear, 'outerwear');
  add(shoes, 'shoes');
  (accessories || []).forEach((acc) => add(acc, acc.category));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground leading-tight truncate">
            {outfitName}
          </h3>
          {styleNote && (
            <p className="text-sm italic text-muted-foreground mt-1 leading-snug line-clamp-3">
              {styleNote}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full whitespace-nowrap">
          {DIRECTION_LABELS[styleDirection]}
        </span>
      </div>

      {/* Item grid */}
      <div className={cn(
        'grid gap-2.5',
        gridItems.length <= 3 ? 'grid-cols-3' :
        gridItems.length === 4 ? 'grid-cols-4' :
        'grid-cols-3',
      )}>
        {gridItems.map(({ item, label, isAnchor }) => (
          <ItemThumbnail
            key={item.id}
            item={item}
            label={label}
            isAnchor={isAnchor}
          />
        ))}
      </div>

      {/* Anchor note */}
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-accent inline-block shrink-0" />
        Anchor item — your selected piece
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
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Saving...
            </>
          ) : isSaved ? (
            'Saved'
          ) : (
            'Save Outfit'
          )}
        </Button>
      </div>
    </div>
  );
}
