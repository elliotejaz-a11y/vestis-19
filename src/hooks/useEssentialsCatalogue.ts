/**
 * useEssentialsCatalogue
 *
 * Manages the essentials catalogue display and a user's personal list of added
 * essentials. Designed for two use cases:
 *
 *   1. Onboarding — user selects ≥ 5 essentials; batch-added on confirm.
 *   2. Browse from + button — individual add/remove with optimistic updates.
 *
 * Data shape:
 *   - essentials_catalogue  — system-wide catalogue (public SELECT)
 *   - user_essentials       — user's join records (SELECT + INSERT + DELETE)
 *   - clothing_items        — a mirrored clothing_item is also created/deleted
 *                             so the essential appears in the wardrobe naturally
 *
 * Performance:
 *   - Active category items are fetched on demand (not all 119 at once).
 *   - User's added essential IDs are fetched once as a lightweight UUID list.
 *   - Optimistic updates keep the UI instant; failures roll back with a toast.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { EssentialsCatalogueItem, ClothingItem } from '@/types/wardrobe';

// ── Query keys ───────────────────────────────────────────────────────────────

const CATALOGUE_KEY = (category: string) => ['essentials_catalogue', category];
const ADDED_IDS_KEY = ['user_essentials_ids'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map an essential to a clothing_item DB row for insertion. */
function essentialToClothingItemRow(
  item: EssentialsCatalogueItem,
  userId: string
): Record<string, unknown> {
  return {
    user_id: userId,
    name: item.name,
    category: item.category.toLowerCase(),
    color: item.colour ?? '',
    fabric: '',
    image_url: item.image_url,
    tags: [...(item.tags ?? []), 'essential'],
    notes: item.description ? `Wardrobe essential · ${item.description}` : 'Wardrobe essential',
    is_private: false,
  };
}

/** Convert an essential to a ClothingItem for use with existing wardrobe flows. */
export function essentialToClothingItem(item: EssentialsCatalogueItem): ClothingItem {
  return {
    id: '',
    name: item.name,
    category: item.category.toLowerCase(),
    color: item.colour ?? '',
    fabric: '',
    imageUrl: item.image_url,
    tags: [...(item.tags ?? []), 'essential'],
    notes: item.description ?? '',
    addedAt: new Date(),
    imageStatus: 'ready',
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseEssentialsCatalogueReturn {
  /** Items in the active category (or all if 'all' is selected). */
  items: EssentialsCatalogueItem[];
  /** Set of essential IDs the current user has already added. */
  addedIds: Set<string>;
  isLoading: boolean;
  isFetchingCategory: boolean;
  error: string | null;
  /** Returns true if the user has already added this essential. */
  isAdded: (id: string) => boolean;
  /** Add a single essential (creates user_essentials + clothing_items record). */
  addEssential: (essential: EssentialsCatalogueItem) => Promise<void>;
  /** Remove a single essential (deletes user_essentials + clothing_items record). */
  removeEssential: (essentialId: string, essentialName: string) => Promise<void>;
  /**
   * Batch-add multiple essentials. Used during onboarding confirmation.
   * Returns the created clothing_item records so the wardrobe can be seeded.
   */
  addMultipleEssentials: (essentials: EssentialsCatalogueItem[]) => Promise<ClothingItem[]>;
}

interface UseEssentialsCatalogueOptions {
  /** Currently selected category — 'all' fetches everything. */
  activeCategory: string;
  /** If true, does not fetch user's added IDs (e.g. non-authenticated onboarding preview). */
  skipUserData?: boolean;
}

export function useEssentialsCatalogue({
  activeCategory,
  skipUserData = false,
}: UseEssentialsCatalogueOptions): UseEssentialsCatalogueReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Catalogue query ──────────────────────────────────────────────────────

  const {
    data: items = [],
    isLoading: isCatalogueLoading,
    isFetching: isFetchingCategory,
    error: catalogueError,
  } = useQuery<EssentialsCatalogueItem[], Error>({
    queryKey: CATALOGUE_KEY(activeCategory),
    queryFn: async () => {
      let query = supabase
        .from('essentials_catalogue')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (activeCategory !== 'all') {
        query = query.ilike('category', activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EssentialsCatalogueItem[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // ── User's added essential IDs (lightweight — just UUIDs) ───────────────

  const {
    data: addedIdsRaw = [],
    isLoading: isAddedIdsLoading,
    error: addedIdsError,
  } = useQuery<string[], Error>({
    queryKey: [...ADDED_IDS_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_essentials')
        .select('essential_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []).map((r: { essential_id: string }) => r.essential_id);
    },
    enabled: !!user && !skipUserData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const addedIds = useMemo(() => new Set(addedIdsRaw), [addedIdsRaw]);

  const isAdded = useCallback((id: string) => addedIds.has(id), [addedIds]);

  // ── Add single essential ─────────────────────────────────────────────────

  const { mutateAsync: addEssential } = useMutation({
    mutationFn: async (essential: EssentialsCatalogueItem) => {
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      queryClient.setQueryData<string[]>(
        [...ADDED_IDS_KEY, user.id],
        (prev = []) => [...prev, essential.id]
      );

      try {
        // 1. Create the clothing_item record so it appears in the wardrobe
        const { data: clothingRow, error: clothingErr } = await supabase
          .from('clothing_items')
          .insert(essentialToClothingItemRow(essential, user.id))
          .select('id')
          .single();

        if (clothingErr) throw clothingErr;

        // 2. Record in user_essentials
        const { error: essentialErr } = await supabase
          .from('user_essentials')
          .insert({ user_id: user.id, essential_id: essential.id })
          .select()
          .single();

        if (essentialErr) {
          // Roll back the clothing_item if essentials insert fails
          await supabase.from('clothing_items').delete().eq('id', clothingRow.id);
          throw essentialErr;
        }

        // Invalidate wardrobe cache so the new item appears
        await queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
        await queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      } catch (err) {
        // Roll back optimistic update
        queryClient.setQueryData<string[]>(
          [...ADDED_IDS_KEY, user.id],
          (prev = []) => prev.filter((id) => id !== essential.id)
        );
        throw err;
      }
    },
    onError: (err: Error) => {
      const isDuplicate = err.message?.includes('unique') || err.message?.includes('duplicate');
      if (!isDuplicate) {
        toast({
          title: 'Couldn\'t add item',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // ── Remove single essential ──────────────────────────────────────────────

  const { mutateAsync: removeEssential } = useMutation({
    mutationFn: async (essentialId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      queryClient.setQueryData<string[]>(
        [...ADDED_IDS_KEY, user.id],
        (prev = []) => prev.filter((id) => id !== essentialId)
      );

      try {
        // Delete user_essentials record
        const { error: delErr } = await supabase
          .from('user_essentials')
          .delete()
          .eq('user_id', user.id)
          .eq('essential_id', essentialId);

        if (delErr) throw delErr;

        // Find and remove the mirrored clothing_item (tagged 'essential')
        const { data: essentialRow } = await supabase
          .from('essentials_catalogue')
          .select('name, category')
          .eq('id', essentialId)
          .single();

        if (essentialRow) {
          // Match by name + category + essential tag (safe: name + category is
          // unique enough within a user's wardrobe for catalogue items)
          const { data: clothingRows } = await supabase
            .from('clothing_items')
            .select('id, tags')
            .eq('user_id', user.id)
            .eq('name', essentialRow.name)
            .ilike('category', essentialRow.category);

          const matchedIds = (clothingRows ?? [])
            .filter((r: { id: string; tags: string[] }) =>
              Array.isArray(r.tags) && r.tags.includes('essential')
            )
            .map((r: { id: string }) => r.id);

          if (matchedIds.length > 0) {
            await supabase
              .from('clothing_items')
              .delete()
              .in('id', matchedIds);
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
        await queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      } catch (err) {
        // Roll back optimistic update
        queryClient.setQueryData<string[]>(
          [...ADDED_IDS_KEY, user.id],
          (prev = []) => [...prev, essentialId]
        );
        throw err;
      }
    },
    onError: () => {
      toast({
        title: 'Couldn\'t remove item',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // ── Batch add (onboarding) ───────────────────────────────────────────────

  const addMultipleEssentials = useCallback(
    async (essentials: EssentialsCatalogueItem[]): Promise<ClothingItem[]> => {
      if (!user) throw new Error('Not authenticated');
      if (essentials.length === 0) return [];

      // Filter out already-added to avoid duplicates
      const toAdd = essentials.filter((e) => !addedIds.has(e.id));
      if (toAdd.length === 0) return [];

      // 1. Batch-insert clothing_items
      const clothingRows = toAdd.map((e) => essentialToClothingItemRow(e, user.id));
      const { data: insertedClothing, error: clothingErr } = await supabase
        .from('clothing_items')
        .insert(clothingRows)
        .select('id, name, category, color, fabric, image_url, tags, notes, created_at');

      if (clothingErr) throw clothingErr;

      // 2. Batch-insert user_essentials
      const essentialRows = toAdd.map((e) => ({
        user_id: user.id,
        essential_id: e.id,
      }));

      const { error: essentialErr } = await supabase
        .from('user_essentials')
        .insert(essentialRows);

      if (essentialErr) {
        // Roll back clothing_items insertion
        const insertedIds = (insertedClothing ?? []).map((r: { id: string }) => r.id);
        if (insertedIds.length > 0) {
          await supabase.from('clothing_items').delete().in('id', insertedIds);
        }
        throw essentialErr;
      }

      // Update local cache
      queryClient.setQueryData<string[]>(
        [...ADDED_IDS_KEY, user.id],
        (prev = []) => [...prev, ...toAdd.map((e) => e.id)]
      );

      await queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      await queryClient.invalidateQueries({ queryKey: ['clothing_items'] });

      // Map inserted rows to ClothingItem shape
      return (insertedClothing ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        color: row.color as string,
        fabric: (row.fabric as string) ?? '',
        imageUrl: row.image_url as string,
        tags: (row.tags as string[]) ?? [],
        notes: (row.notes as string) ?? '',
        addedAt: new Date((row.created_at as string) ?? Date.now()),
        imageStatus: 'ready' as const,
      }));
    },
    [user, addedIds, queryClient]
  );

  const isLoading = isCatalogueLoading || (!!user && !skipUserData && isAddedIdsLoading);
  const error = catalogueError?.message ?? addedIdsError?.message ?? null;

  return {
    items,
    addedIds,
    isLoading,
    isFetchingCategory,
    error,
    isAdded,
    addEssential,
    removeEssential: (id: string, _name: string) => removeEssential(id),
    addMultipleEssentials,
  };
}
