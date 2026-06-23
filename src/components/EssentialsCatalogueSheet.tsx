import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Check, Plus, X, Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEssentialsCatalogue } from '@/hooks/useEssentialsCatalogue';
import type { EssentialsCatalogueItem, ClothingItem } from '@/types/wardrobe';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all',         label: 'All'         },
  { value: 'Tops',        label: 'Tops'        },
  { value: 'Bottoms',     label: 'Bottoms'     },
  { value: 'Shoes',       label: 'Shoes'       },
  { value: 'Outerwear',   label: 'Outerwear'   },
  { value: 'Dresses',     label: 'Dresses'     },
  { value: 'Knitwear',    label: 'Knitwear'    },
  { value: 'Accessories', label: 'Accessories' },
  { value: 'Bags',        label: 'Bags'        },
] as const;

// ── Individual item card ──────────────────────────────────────────────────────

interface CardProps {
  item: EssentialsCatalogueItem;
  isAdded: boolean;
  /** Selection state for onboarding multi-select mode. */
  isSelected?: boolean;
  onAdd?: (item: EssentialsCatalogueItem) => void;
  onRemove?: (id: string, name: string) => void;
  onSelect?: (item: EssentialsCatalogueItem, selected: boolean) => void;
  onStyleThis?: (item: EssentialsCatalogueItem) => void;
  /** When true, shows a checkbox-style selector instead of add/remove. */
  multiSelectMode?: boolean;
}

const EssentialCard = memo(function EssentialCard({
  item,
  isAdded,
  isSelected = false,
  onAdd,
  onRemove,
  onSelect,
  onStyleThis,
  multiSelectMode = false,
}: CardProps) {
  const [imgError, setImgError] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleToggle = useCallback(async () => {
    if (multiSelectMode) {
      onSelect?.(item, !isSelected);
      return;
    }
    if (isAdded) {
      setRemoving(true);
      await onRemove?.(item.id, item.name);
      setRemoving(false);
    } else {
      onAdd?.(item);
    }
  }, [multiSelectMode, isAdded, isSelected, item, onAdd, onRemove, onSelect]);

  const active = multiSelectMode ? isSelected : isAdded;

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden flex flex-col relative">
      {/* Image */}
      <div className="relative aspect-square bg-muted/30 flex-shrink-0 overflow-hidden">
        {!imgError && item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Added/selected overlay */}
        {active && (
          <div className="absolute inset-0 bg-accent/15 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md">
              <Check className="w-4 h-4 text-accent-foreground" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Colour swatch */}
        {item.colour_hex && (
          <div
            className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border border-white/70 shadow-sm ring-1 ring-black/10"
            style={{ backgroundColor: item.colour_hex }}
            title={item.colour ?? undefined}
          />
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-2.5 pb-1 flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
          {item.name}
        </p>
        {item.colour && (
          <p className="text-[10px] text-muted-foreground mt-1 capitalize">{item.colour}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-2.5 flex items-center justify-between gap-1.5 mt-auto">
        {/* Style This — only in wardrobe/browse mode */}
        {!multiSelectMode && onStyleThis && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStyleThis(item); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Sparkles className="w-2.5 h-2.5" />
            Style
          </button>
        )}

        {/* Add / Remove / Select */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={removing}
          className={cn(
            'ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150 active:scale-95',
            active
              ? 'bg-accent/10 text-accent border border-accent/40'
              : 'bg-accent text-accent-foreground hover:bg-accent/90',
          )}
        >
          {removing ? (
            <span className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />
          ) : active ? (
            multiSelectMode ? (
              <><Check className="w-3 h-3" /> Selected</>
            ) : (
              <><X className="w-3 h-3" /> Remove</>
            )
          ) : (
            <><Plus className="w-3 h-3" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {isSearch ? (
          <Search className="w-6 h-6 text-muted-foreground/50" />
        ) : (
          <Package className="w-6 h-6 text-muted-foreground/50" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isSearch ? 'No results found' : 'Nothing here yet'}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
        {isSearch
          ? 'Try a different term or browse by category.'
          : 'This collection is still being curated. Check back soon.'}
      </p>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/40 overflow-hidden animate-pulse">
          <div className="aspect-square bg-muted/50" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-muted/50 rounded-full w-3/4" />
            <div className="h-2.5 bg-muted/40 rounded-full w-1/2" />
          </div>
          <div className="px-2.5 pb-2.5 flex justify-end">
            <div className="h-6 w-14 bg-muted/40 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main sheet ────────────────────────────────────────────────────────────────

export interface EssentialsCatalogueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * If provided, adds the essential to the user's wardrobe and fires this
   * callback so the parent can update wardrobe state.
   */
  onAdd?: (item: ClothingItem) => void;
  /**
   * If provided, fires a "Style This" flow for the selected essential.
   */
  onStyleThis?: (item: ClothingItem) => void;
  /**
   * When true, the sheet operates in multi-select "onboarding" mode:
   *   - Shows a live counter instead of individual add/remove
   *   - "Continue" button fires onConfirmSelection with selected items
   *   - A minimum count can be enforced
   */
  multiSelectMode?: boolean;
  minSelection?: number;
  onConfirmSelection?: (items: EssentialsCatalogueItem[]) => Promise<void>;
  /** Title override for onboarding mode */
  title?: string;
  subtitle?: string;
}

export function EssentialsCatalogueSheet({
  open,
  onOpenChange,
  onAdd,
  onStyleThis,
  multiSelectMode = false,
  minSelection = 5,
  onConfirmSelection,
  title,
  subtitle,
}: EssentialsCatalogueSheetProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, EssentialsCatalogueItem>>(new Map());
  const [confirming, setConfirming] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { items, isLoading, isFetchingCategory, isAdded, addEssential, removeEssential } =
    useEssentialsCatalogue({ activeCategory });

  // Filter by search query (client-side — works across all fetched items)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.colour ?? '').toLowerCase().includes(q) ||
        (item.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (item.subcategory ?? '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // Auto-scroll active category tab into view
  useEffect(() => {
    const activeTab = tabsRef.current?.querySelector('[data-active="true"]');
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeCategory]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      if (!multiSelectMode) setActiveCategory('all');
    }
  }, [open, multiSelectMode]);

  const handleSelect = useCallback(
    (item: EssentialsCatalogueItem, selected: boolean) => {
      setSelectedItems((prev) => {
        const next = new Map(prev);
        if (selected) next.set(item.id, item);
        else next.delete(item.id);
        return next;
      });
    },
    []
  );

  const handleAddSingle = useCallback(
    async (essential: EssentialsCatalogueItem) => {
      try {
        await addEssential(essential);
        if (onAdd) {
          onAdd({
            id: '',
            name: essential.name,
            category: essential.category.toLowerCase(),
            color: essential.colour ?? '',
            fabric: '',
            imageUrl: essential.image_url,
            tags: [...(essential.tags ?? []), 'essential'],
            notes: essential.description ?? '',
            addedAt: new Date(),
            imageStatus: 'ready',
          });
        }
      } catch {
        // Error toasted by hook
      }
    },
    [addEssential, onAdd]
  );

  const handleRemoveSingle = useCallback(
    async (id: string, name: string) => {
      await removeEssential(id, name);
    },
    [removeEssential]
  );

  const handleStyleThis = useCallback(
    (essential: EssentialsCatalogueItem) => {
      onStyleThis?.({
        id: '',
        name: essential.name,
        category: essential.category.toLowerCase(),
        color: essential.colour ?? '',
        fabric: '',
        imageUrl: essential.image_url,
        tags: [...(essential.tags ?? []), 'essential'],
        notes: essential.description ?? '',
        addedAt: new Date(),
        imageStatus: 'ready',
      });
    },
    [onStyleThis]
  );

  const handleConfirm = async () => {
    if (!onConfirmSelection) return;
    setConfirming(true);
    try {
      await onConfirmSelection(Array.from(selectedItems.values()));
    } finally {
      setConfirming(false);
    }
  };

  const selectedCount = selectedItems.size;
  const canConfirm = selectedCount >= minSelection;

  const displayTitle = title ?? 'Browse Essentials';
  const displaySubtitle = subtitle ?? 'Add timeless pieces to your wardrobe.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] rounded-t-3xl bg-background flex flex-col p-0 overflow-hidden"
        style={{ zIndex: 10001 }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-3 shrink-0 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground truncate">
              {displayTitle}
            </h2>
            {multiSelectMode ? (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{displaySubtitle}</p>
                <span
                  className={cn(
                    'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full transition-colors',
                    canConfirm
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {selectedCount} / {minSelection}
                  {canConfirm && ' ✓'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">{displaySubtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, colour or style…"
              className="pl-9 rounded-xl bg-card border-border/60 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div
          ref={tabsRef}
          className="px-5 pb-3 shrink-0 flex gap-2 overflow-x-auto no-scrollbar"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              data-active={activeCategory === cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 shrink-0',
                activeCategory === cat.value
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card text-muted-foreground border border-border hover:border-accent/40',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Item count ── */}
        {!isLoading && filtered.length > 0 && (
          <p className="px-5 pb-2 shrink-0 text-xs text-muted-foreground">
            {isFetchingCategory
              ? 'Loading…'
              : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState isSearch={!!search} />
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 pb-28">
              {filtered.map((item) => (
                <EssentialCard
                  key={item.id}
                  item={item}
                  isAdded={isAdded(item.id)}
                  isSelected={selectedItems.has(item.id)}
                  onAdd={handleAddSingle}
                  onRemove={handleRemoveSingle}
                  onSelect={handleSelect}
                  onStyleThis={onStyleThis ? handleStyleThis : undefined}
                  multiSelectMode={multiSelectMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Onboarding confirm button ── */}
        {multiSelectMode && (
          <div
            className="shrink-0 px-5 pb-6 pt-3 border-t border-border/50 bg-background"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || confirming}
              className={cn(
                'w-full h-12 rounded-2xl text-sm font-semibold transition-all',
                canConfirm && !confirming
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98]'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent-foreground/40 border-t-accent-foreground rounded-full animate-spin" />
                  Adding to wardrobe…
                </span>
              ) : canConfirm ? (
                `Add ${selectedCount} essentials to wardrobe`
              ) : (
                `Select at least ${minSelection} essentials to continue`
              )}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
