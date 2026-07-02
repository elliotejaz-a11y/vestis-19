/**
 * useStyleThisItem — manages the full "Style This Item" flow.
 *
 * State managed:
 *  - anchorItem:       The selected clothing item to build an outfit around.
 *  - isSheetOpen:      Whether the Style This Item bottom sheet is visible.
 *  - occasion:         User-selected StyleOccasion (null until chosen).
 *  - styleDirection:   User-selected StyleDirection (null until chosen).
 *  - isGenerating:     True while the AI call is in flight.
 *  - result:           StyledOutfitResult once generation succeeds, or null.
 *  - error:            User-facing error string, or null.
 *  - isSaved:          True after the user taps "Save Outfit" successfully.
 *
 * Integration:
 *  1. Call useStyleThisItem(wardrobeItems) at the component level.
 *  2. Call openWithItem(item) to open the sheet with a specific anchor.
 *  3. Pass weather from useWeather() into the hook via setWeather().
 *  4. generate() calls the existing generate-outfit edge function (guided mode)
 *     with a custom preBuiltPrompt. It does NOT create a new edge function.
 *  5. saveOutfit() writes the result to Supabase outfits + outfit_items tables.
 *
 * Edge function called: generate-outfit (existing, unmodified contract).
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildStyleThisItemPrompt } from '@/lib/styleThisItemPrompt';
import { RECENT_OUTFIT_SIMILARITY_WINDOW } from '@/lib/outfitConstants';
import type {
  ClothingItem,
  Outfit,
  StyleOccasion,
  StyleDirection,
  WeatherContext,
  StyledOutfitResult,
  StyleThisItemRequest,
} from '@/types/wardrobe';

// ── Occasion labels (for edge function occasion string) ─────────────────────

const OCCASION_LABEL: Record<StyleOccasion, string> = {
  everyday_casual: 'Everyday Casual',
  work_office: 'Work Office',
  date_night: 'Date Night',
  formal_event: 'Formal Event',
  outdoor_active: 'Outdoor Active',
  weekend_brunch: 'Weekend Brunch',
  night_out: 'Night Out',
  travel: 'Travel',
};

// ── Inline constraint helpers ────────────────────────────────────────────────

function categorise(item: ClothingItem): string {
  return (item.category || '').toLowerCase();
}

function isTopOrDress(item: ClothingItem): boolean {
  const c = categorise(item);
  return c === 'tops' || c === 'dresses' || c === 'jumpers';
}

function isOuterwear(item: ClothingItem): boolean {
  return categorise(item) === 'outerwear';
}

function isJumper(item: ClothingItem): boolean {
  return categorise(item) === 'jumpers';
}

/** Enforce single outerwear rule: keep max 1 outerwear item. */
function enforceOuterwear(items: ClothingItem[], weather: WeatherContext): ClothingItem[] {
  const outerwearItems = items.filter(isOuterwear);
  if (outerwearItems.length <= 1) {
    // Also strip jumper if outerwear is present — they're mutually exclusive
    if (outerwearItems.length === 1) {
      return items.filter((i) => !isJumper(i));
    }
    return items;
  }
  // Keep the most contextually appropriate outerwear
  const isRainy = weather.condition === 'rainy';
  const isCold = weather.condition === 'cold' || weather.temperatureCelsius < 8;
  const WATERPROOF = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex)\b/i;
  const HEAVY = /\b(puffer|parka|padded jacket|down jacket|peacoat|wool coat|trench coat)\b/i;

  let keep: ClothingItem;
  if (isRainy) keep = outerwearItems.find((i) => WATERPROOF.test([i.name, i.fabric, ...(i.tags || [])].join(' '))) ?? outerwearItems[0];
  else if (isCold) keep = outerwearItems.find((i) => HEAVY.test([i.name, i.fabric, ...(i.tags || [])].join(' '))) ?? outerwearItems[0];
  else keep = outerwearItems[0];

  return items.filter((i) => !isOuterwear(i) || i.id === keep.id).filter((i) => !isJumper(i));
}

/** If no top is present but there is a jumper, inject the best available top. */
function ensureTopPresent(items: ClothingItem[], wardrobeItems: ClothingItem[]): ClothingItem[] {
  const hasTop = items.some((i) => categorise(i) === 'tops' || categorise(i) === 'dresses');
  const hasJumper = items.some(isJumper);
  if (hasTop || !hasJumper) return items;

  const usedIds = new Set(items.map((i) => i.id));
  const topCandidate = wardrobeItems.find(
    (i) => (categorise(i) === 'tops' || categorise(i) === 'dresses') && !usedIds.has(i.id)
  );
  if (!topCandidate) return items;

  // Insert the top before the jumper
  const jumperIdx = items.findIndex(isJumper);
  const result = [...items];
  result.splice(jumperIdx, 0, topCandidate);
  return result;
}

/** Map edge function response items into StyledOutfitResult.items structure. */
function mapToResultItems(
  selectedItems: ClothingItem[],
  anchorItem: ClothingItem,
): StyledOutfitResult['items'] {
  const get = (pred: (i: ClothingItem) => boolean) => selectedItems.find(pred);
  const getAll = (pred: (i: ClothingItem) => boolean) => selectedItems.filter(pred);

  return {
    anchor: anchorItem,
    top: get((i) => categorise(i) === 'tops' || categorise(i) === 'dresses'),
    bottom: get((i) => categorise(i) === 'bottoms'),
    outerwear: get((i) => categorise(i) === 'outerwear'),
    shoes: get((i) => categorise(i) === 'shoes'),
    accessories: getAll((i) => categorise(i) === 'accessories' || categorise(i) === 'hats'),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseStyleThisItemReturn {
  anchorItem: ClothingItem | null;
  isSheetOpen: boolean;
  occasion: StyleOccasion | null;
  styleDirection: StyleDirection | null;
  weather: WeatherContext | null;
  isGenerating: boolean;
  result: StyledOutfitResult | null;
  error: string | null;
  isSaved: boolean;
  openWithItem: (item: ClothingItem) => void;
  setIsSheetOpen: (open: boolean) => void;
  setOccasion: (o: StyleOccasion) => void;
  setStyleDirection: (d: StyleDirection) => void;
  setWeather: (w: WeatherContext) => void;
  generate: () => Promise<void>;
  saveOutfit: () => Promise<Outfit>;
  reset: () => void;
}

export function useStyleThisItem(wardrobeItems: ClothingItem[]): UseStyleThisItemReturn {
  const { user } = useAuth();

  const [anchorItem, setAnchorItem] = useState<ClothingItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [occasion, setOccasion] = useState<StyleOccasion | null>(null);
  const [styleDirection, setStyleDirection] = useState<StyleDirection | null>(null);
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StyledOutfitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Stable ref so generate() always sees current wardrobe
  const wardrobeRef = useRef(wardrobeItems);
  wardrobeRef.current = wardrobeItems;

  const openWithItem = useCallback((item: ClothingItem) => {
    setAnchorItem(item);
    setIsSheetOpen(true);
    setOccasion(null);
    setStyleDirection(null);
    setResult(null);
    setError(null);
    setIsSaved(false);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsSaved(false);
    setOccasion(null);
    setStyleDirection(null);
  }, []);

  const generate = useCallback(async () => {
    const anchor = anchorItem;
    const items = wardrobeRef.current;

    // ── Pre-flight validation ────────────────────────────────────────────────
    if (!anchor) { setError('No item selected.'); return; }
    if (!occasion) { setError('Please select an occasion.'); return; }
    if (!styleDirection) { setError('Please select a style direction.'); return; }
    if (!weather) { setError('Enter your weather details to continue.'); return; }

    const nonAnchor = items.filter((i) => i.id !== anchor.id);
    if (nonAnchor.length < 3) {
      setError('Your wardrobe needs a few more pieces before we can style this item.');
      return;
    }

    const anchorCat = categorise(anchor);
    const isAnchorTop = anchorCat === 'tops' || anchorCat === 'dresses' || anchorCat === 'jumpers';
    const isAnchorBottom = anchorCat === 'bottoms';
    const isAnchorShoe = anchorCat === 'shoes';

    if (!isAnchorTop && !nonAnchor.some(isTopOrDress)) {
      setError('We couldn\'t find a matching top in your wardrobe. Try adding more tops.');
      return;
    }
    if (!isAnchorBottom && !nonAnchor.some((i) => categorise(i) === 'bottoms')) {
      setError('Add at least one bottoms item to your wardrobe to complete this look.');
      return;
    }
    if (!isAnchorShoe && !nonAnchor.some((i) => categorise(i) === 'shoes')) {
      setError('Add at least one pair of shoes to your wardrobe to complete this look.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setIsSaved(false);

    try {
      // ── Fetch recent outfit IDs ──────────────────────────────────────────
      type RecentOutfitRow = { id: string; outfit_items: { clothing_item_id: string }[] | null };
      let recentItemIds: string[][] = [];
      try {
        const { data: recentRows } = await supabase
          .from('outfits')
          .select('id, outfit_items(clothing_item_id)')
          .eq('user_id', user?.id ?? '')
          .order('created_at', { ascending: false })
          .limit(RECENT_OUTFIT_SIMILARITY_WINDOW);
        recentItemIds = ((recentRows as RecentOutfitRow[] | null) || []).map((o) =>
          (o.outfit_items || []).map((oi) => oi.clothing_item_id)
        );
      } catch {
        // Non-fatal — proceed without recency data
      }

      // ── Build request + prompt ───────────────────────────────────────────
      const request: StyleThisItemRequest = {
        anchorItem: anchor,
        occasion,
        styleDirection,
        weather,
        wardrobeItems: items,
      };

      const preBuiltPrompt = buildStyleThisItemPrompt(request, recentItemIds);

      // Translate WeatherContext → edge function weather format
      const weatherForEdge = {
        temp: weather.temperatureCelsius,
        description: weather.condition,
      };

      // ── Call generate-outfit edge function with client-side retry on rate limit ──
      const edgeBody = {
        occasion: OCCASION_LABEL[occasion],
        items: items,
        weather: weatherForEdge,
        recentOutfitItemIds: recentItemIds,
        preBuiltPrompt,
        mandatoryAnchorId: anchor.id,
        mandatoryAnchorName: anchor.name,
      };

      const invokeWithRetry = async () => {
        for (let attempt = 0; attempt <= 1; attempt++) {
          if (attempt > 0) {
            setError('Generation service is busy — retrying automatically...');
            await new Promise<void>(r => setTimeout(r, 12000));
            setError(null);
          }
          const { data, error: fnError } = await supabase.functions.invoke('generate-outfit', { body: edgeBody });
          if (fnError) {
            let bodyMsg = '';
            try {
              const ctx = (fnError as { context?: Response }).context;
              if (ctx) {
                const bodyJson = await ctx.clone().json().catch(() => null);
                bodyMsg = bodyJson?.error || bodyJson?.message || '';
              }
            } catch { /* ignore */ }
            const msg = bodyMsg || (fnError instanceof Error ? fnError.message : String(fnError));
            if (msg === 'spending_cap') throw new Error('spending_cap');
            if (msg === 'rate_limit' && attempt < 1) continue;
            if (msg === 'rate_limit') throw new Error('rate_limit');
            if (/credit|payment|402/i.test(msg)) throw new Error('credits');
            throw new Error(msg);
          }
          return data;
        }
      };

      const data = await invokeWithRetry();

      if (!data || typeof data !== 'object') {
        throw new Error('Empty response from generation service.');
      }

      let selectedItems: ClothingItem[] = (data.items || []) as ClothingItem[];
      if (selectedItems.length === 0) {
        throw new Error('No items returned from AI');
      }

      // ── Enforce anchor presence ──────────────────────────────────────────
      const hasAnchor = selectedItems.some((i) => i.id === anchor.id);
      if (!hasAnchor) {
        // Inject anchor into its correct slot, removing any existing item in that slot
        const anchorCatNorm = categorise(anchor);
        const slotOccupied = selectedItems.find((i) => categorise(i) === anchorCatNorm);
        if (slotOccupied) {
          selectedItems = selectedItems.map((i) =>
            i.id === slotOccupied.id ? anchor : i
          );
        } else {
          selectedItems = [anchor, ...selectedItems];
        }
      }

      // ── Enforce outfit constraints ───────────────────────────────────────
      // Deduplicate
      const seen = new Set<string>();
      selectedItems = selectedItems.filter((i) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });

      // Single outerwear + outerwear/jumper exclusivity
      selectedItems = enforceOuterwear(selectedItems, weather);

      // Ensure top is present if jumper is included and anchor is not a top
      if (!isAnchorTop) {
        selectedItems = ensureTopPresent(selectedItems, items);
      }

      // Validate top presence (post-constraints)
      const hasTop = selectedItems.some(isTopOrDress);
      if (!isAnchorTop && !hasTop) {
        throw new Error('missing_top');
      }

      // ── Map to StyledOutfitResult ────────────────────────────────────────
      const outfitResult: StyledOutfitResult = {
        outfitId: crypto.randomUUID(),
        outfitName: (data.outfit_name as string) || 'Your Styled Look',
        styleNote: (data.reasoning as string) || '',
        items: mapToResultItems(selectedItems, anchor),
        occasion,
        styleDirection,
        weatherContext: weather,
        generatedAt: new Date().toISOString(),
      };

      setResult(outfitResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'missing_top') {
        setError('We couldn\'t find a matching top in your wardrobe. Try adding more tops.');
      } else if (msg === 'spending_cap') {
        setError('Generation service is temporarily unavailable. Please try again later.');
      } else if (msg === 'rate_limit') {
        setError('Too many requests. Wait a moment and try again.');
      } else if (msg === 'credits') {
        setError('Generation service unavailable. Please try again later.');
      } else {
        // Show actual error temporarily for diagnosis — replace with generic message once fixed
        setError(msg || 'Something went wrong generating your outfit. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [anchorItem, occasion, styleDirection, weather, user]);

  const saveOutfit = useCallback(async (): Promise<Outfit> => {
    if (!result || !user) throw new Error('save_failed');

    const allItems = [
      result.items.anchor,
      result.items.top,
      result.items.bottom,
      result.items.outerwear,
      result.items.shoes,
      ...(result.items.accessories || []),
    ].filter((i): i is ClothingItem => !!i);

    // Deduplicate (anchor may also be in top/bottom/shoes slot)
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    try {
      const { data: outfitRow, error: insertErr } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: result.outfitName,
          occasion: OCCASION_LABEL[result.occasion],
          reasoning: result.styleNote,
          saved: true,
        } as Record<string, unknown>)
        .select()
        .single();

      if (insertErr || !outfitRow) throw insertErr ?? new Error('Insert failed');

      if (uniqueItems.length > 0) {
        await supabase.from('outfit_items').insert(
          uniqueItems.map((i) => ({
            outfit_id: outfitRow.id,
            clothing_item_id: i.id,
          }))
        );
      }

      // Increment all-time counter — persists even if the outfit is later deleted.
      await supabase.rpc('increment_total_outfits_generated', { p_user_id: user.id });

      setIsSaved(true);
      setResult((prev) => prev ? { ...prev, outfitId: outfitRow.id } : prev);

      return {
        id: outfitRow.id as string,
        name: result.outfitName,
        occasion: OCCASION_LABEL[result.occasion],
        items: uniqueItems,
        createdAt: new Date(result.generatedAt),
        reasoning: result.styleNote,
        saved: true,
      };
    } catch {
      // Caller (UI) will show a toast or inline error
      throw new Error('save_failed');
    }
  }, [result, user]);

  return {
    anchorItem,
    isSheetOpen,
    occasion,
    styleDirection,
    weather,
    isGenerating,
    result,
    error,
    isSaved,
    openWithItem,
    setIsSheetOpen,
    setOccasion,
    setStyleDirection,
    setWeather,
    generate,
    saveOutfit,
    reset,
  };
}
