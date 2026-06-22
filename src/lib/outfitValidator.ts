/**
 * Post-generation outfit validator.
 *
 * Checks whether the AI-selected items are appropriate for the occasion
 * using the taxonomy's forbiddenCategories and forbiddenPatterns.
 * Violations are non-blocking — callers decide whether to warn, log, or regenerate.
 */

import type { ClothingItem } from '@/types/wardrobe';
import type { OccasionCategory } from '@/lib/occasionTaxonomy';
import { OCCASION_PROFILES } from '@/lib/occasionTaxonomy';

export interface ValidationViolation {
  itemName: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
}

function getSearchText(item: ClothingItem): string {
  return [item.name, item.category, item.color, item.fabric, item.notes, ...(item.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();
}

/**
 * Validates that the given outfit items are appropriate for the occasion category.
 * Returns a result with a list of violations (empty list = valid).
 */
export function validateOutfitForOccasion(
  items: ClothingItem[],
  occasionCategory: OccasionCategory,
): ValidationResult {
  const profile = OCCASION_PROFILES[occasionCategory];
  const violations: ValidationViolation[] = [];

  for (const item of items) {
    const cat = (item.category || '').toLowerCase();
    const text = getSearchText(item);

    if (profile.forbiddenCategories.includes(cat as any)) {
      violations.push({
        itemName: item.name,
        reason: `"${item.category}" items are not appropriate for ${profile.label}`,
      });
      continue;
    }

    for (const pattern of profile.forbiddenPatterns) {
      if (pattern.test(text)) {
        violations.push({
          itemName: item.name,
          reason: `This item doesn't suit ${profile.label} dress standards`,
        });
        break;
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
