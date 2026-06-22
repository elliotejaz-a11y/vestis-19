import { useNavigate } from 'react-router-dom';
import { Sparkles, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClothingItem } from '@/types/wardrobe';

const CATEGORY_EMOJI: Record<string, string> = {
  tops: '👕',
  bottoms: '👖',
  dresses: '👗',
  jumpers: '🧶',
  outerwear: '🧥',
  shoes: '👟',
  accessories: '👜',
  hats: '🧢',
};

interface StyleThisItemPickerProps {
  items: ClothingItem[];
  dataReady: boolean;
  selectedId: string | null;
  onItemSelect: (item: ClothingItem) => void;
  onDeselect?: () => void;
}

export function StyleThisItemPicker({ items, dataReady, selectedId, onItemSelect, onDeselect }: StyleThisItemPickerProps) {
  const navigate = useNavigate();

  if (!dataReady) {
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2" aria-label="Loading wardrobe items">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[72px] h-[110px] rounded-xl bg-card border border-border/40 animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center rounded-2xl bg-card border border-border/40">
        <Shirt className="w-7 h-7 text-muted-foreground mb-2" />
        <p className="text-xs font-medium text-foreground">Your wardrobe is empty</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
          Add items to your wardrobe to use this feature
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium"
        >
          Add to wardrobe
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
      role="listbox"
      aria-label="Select a wardrobe item to style"
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <button
            key={item.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => item.id === selectedId ? onDeselect?.() : onItemSelect(item)}
            className={cn(
              'relative flex-shrink-0 flex flex-col w-[72px] rounded-xl bg-card border shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isSelected
                ? 'border-[#8B1A2E] ring-2 ring-[#8B1A2E]/60'
                : 'border-border/60 hover:border-border',
            )}
          >
            <div className="w-full h-[90px] rounded-t-xl overflow-hidden bg-white">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl" aria-hidden="true">
                  {CATEGORY_EMOJI[(item.category ?? '').toLowerCase()] ?? '👕'}
                </div>
              )}
            </div>
            <p className="px-1 py-1 text-[9px] font-medium text-muted-foreground truncate w-full text-center leading-tight capitalize">
              {item.category}
            </p>
            {isSelected && (
              <div
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#8B1A2E] flex items-center justify-center"
                aria-hidden="true"
              >
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        );
      })}
      <button
        onClick={() => navigate('/')}
        className="flex-shrink-0 self-center px-2 text-xs font-medium text-[#8B1A2E] underline underline-offset-2 whitespace-nowrap"
        aria-label="View all wardrobe items"
      >
        View all
      </button>
    </div>
  );
}
