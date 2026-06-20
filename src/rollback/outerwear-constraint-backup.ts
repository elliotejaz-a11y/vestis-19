/**
 * ROLLBACK SNAPSHOT — pre-outerwear-constraint
 *
 * This file captures the original state of every code section modified by the
 * "outerwear constraint" change. To revert completely:
 *
 *   1. In src/lib/outfitPromptBuilder.ts — replace the `rules` const with
 *      ORIGINAL_PROMPT_BUILDER_RULES below.
 *   2. In src/hooks/useWardrobe.ts — remove the enforceOuterwearConstraint
 *      function and the call to it inside invokeAI (see ORIGINAL_INVOKE_AI_BLOCK).
 *   3. In supabase/functions/generate-outfit/index.ts — replace the
 *      NON-NEGOTIABLE RULES block with ORIGINAL_LEGACY_SYSTEM_PROMPT_RULES.
 *   4. Delete this file.
 *
 * No other files were modified.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: src/lib/outfitPromptBuilder.ts
// SECTION: buildAIPrompt() → rules const (lines 165–179 pre-change)
// ─────────────────────────────────────────────────────────────────────────────
//
// ORIGINAL_PROMPT_BUILDER_RULES:
//
//   const rules = [
//     '## SLOT RULES',
//     '- Top (shirt) is ALWAYS required. A jumper LAYERS over the shirt — it does NOT replace it.',
//     '- Bottoms are ALWAYS required.',
//     '- LAYERING RULE: A maximum of 1 jumper or hoodie per outfit. You may include 1 jumper alongside outerwear (puffer, jacket, coat) but you must never select 2 jumpers or 2 hoodies. Outerwear does not count toward this limit.',
//     weatherRules.needsJumper || (!weatherRules.noOuterwear && !weatherRules.needsPuffer)
//       ? '- Jumper slot: include if available and relevant.'
//       : null,
//     weatherRules.needsPuffer ? '- Cold weather: jumper + puffer/coat both required if available.' : null,
//     weatherRules.isRaining ? '- Rain: always include waterproof outerwear.' : null,
//     weatherRules.noOuterwear ? '- Warm weather: no outerwear unless the occasion requires it.' : null,
//     recentIdCounts.size > 0
//       ? '- Items marked ⚠️ or 🚫 have been worn recently. Rotate across ALL slots equally — prefer fresh tops, bottoms, shoes, and accessories. No single slot gets priority over another.'
//       : null,
//   ].filter(Boolean).join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// FILE 2: src/hooks/useWardrobe.ts
// SECTION A: enforceOuterwearConstraint did not exist — nothing to restore here
//            (the function is entirely new; to revert, delete it from the file)
//
// SECTION B: inside invokeAI(), the post-processing block (pre-change):
// ─────────────────────────────────────────────────────────────────────────────
//
// ORIGINAL_INVOKE_AI_BLOCK (inside invokeAI, after edge function call):
//
//   let selected: ClothingItem[] = gymRequest
//     ? ensureGymOutfitHasOnlyAllowedPieces((data.items || []) as ClothingItem[], items)
//     : ensureOutfitHasCorePieces((data.items || []) as ClothingItem[], items);
//
//   if (!gymRequest && slotResult) {
//     selected = ensureTopIsPresent(selected, items, slotResult);
//     selected = enforceSingleJumperRule(selected, mandatoryAnchor?.id);
//   }
//
//   return {
//     items: selected,
//     reasoning: data.reasoning || '',
//     style_tips: typeof data.style_tips === 'string' ? data.style_tips : null,
//   };

// ─────────────────────────────────────────────────────────────────────────────
// FILE 3: supabase/functions/generate-outfit/index.ts
// SECTION: legacy systemPrompt → NON-NEGOTIABLE RULES (lines 702–706 pre-change)
// ─────────────────────────────────────────────────────────────────────────────
//
// ORIGINAL_LEGACY_SYSTEM_PROMPT_RULES (the block starting "## NON-NEGOTIABLE RULES"):
//
//   ## NON-NEGOTIABLE RULES
//   1. The outfit MUST match the occasion tier above. Never put gym wear at a wedding, never put a blazer at the gym, never put dress shoes at the beach.
//   2. The outfit MUST include exactly: 1 top/shirt/jumper, 1 bottom, 1 pair of shoes — at minimum. A top is MANDATORY in every outfit without exception. Add outerwear/hat/accessory ONLY if it enhances the look and fits the occasion.
//   3. For ACTIVE/GYM: return EXACTLY 3 items (top + bottom + shoes) — no exceptions.
//   3a. LAYERING RULE: A maximum of 1 jumper or hoodie per outfit. You may include 1 jumper alongside outerwear (puffer, jacket, coat) but you must never select 2 jumpers or 2 hoodies. Outerwear does not count toward this limit.
//   4. WARDROBE ROTATION (mandatory): Items marked ⚠️ or 🚫 have been worn recently ...
//
// (Rule 3b did not exist. To revert, delete the 3b line added after 3a.)

export {}; // keeps TypeScript happy — this file is never imported
