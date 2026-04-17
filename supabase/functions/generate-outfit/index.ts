import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://vestisapp.online',
  'https://www.vestisapp.online',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
];

const GYM_OCCASION_PATTERN = /\b(gym|workout|training|exercise|fitness|run|running|jog|jogging|cardio|lift|lifting|weights?|pilates|yoga|sport|sports)\b/i;
const FORMAL_OCCASION_PATTERN = /\b(wedding|gala|black[-\s]?tie|formal|cocktail|funeral|opera)\b/i;
const BUSINESS_OCCASION_PATTERN = /\b(business|interview|meeting|office|work|corporate|conference|presentation)\b/i;
const SMART_CASUAL_PATTERN = /\b(date|dinner|brunch|drinks|party|night out|event)\b/i;
const BEACH_PATTERN = /\b(beach|pool|swim|holiday|vacation|tropical|summer)\b/i;

const GYM_TOP_POSITIVE_PATTERN = /\b(t-?shirt|tee|compression|activewear|athletic|performance|training|workout|gym|sport|sports|polyester|spandex|elastane|nylon|dry[-\s]?fit|moisture[-\s]?wicking|tight(?:-?fitting)?|fitted|jersey|tank)\b/i;
const GYM_TOP_NEGATIVE_PATTERN = /\b(jacket|coat|hoodie|jumper|sweater|cardigan|blazer|outerwear|parka|puffer|fleece|windbreaker|flannel|dress shirt|button[-\s]?up|oxford|knit|wool|zip[-\s]?up|anorak|shell)\b/i;
const GYM_BOTTOM_POSITIVE_PATTERN = /\b(shorts?|track ?pants?|trackpants?|joggers?|training pants?|workout pants?|athletic|performance|training|workout|gym|sport|sports|lightweight|polyester|spandex|elastane|nylon)\b/i;
const GYM_BOTTOM_NEGATIVE_PATTERN = /\b(jeans?|denim|chinos?|slacks?|trousers?|dress pants?|formal|corduroy|cargo|skirt|wool)\b/i;
const GYM_SHOE_NEGATIVE_PATTERN = /\b(sandals?|slides?|flip[-\s]?flops?|heels?|boots?|loafers?|oxfords?|derbies?|brogues?|mules?|slippers?)\b/i;

const SKIN_TONE_LABELS = [
  { value: 0, label: 'Porcelain' },
  { value: 7, label: 'Ivory' },
  { value: 14, label: 'Warm Ivory' },
  { value: 21, label: 'Light Beige' },
  { value: 29, label: 'Warm Beige' },
  { value: 36, label: 'Golden Beige' },
  { value: 43, label: 'Honey' },
  { value: 50, label: 'Golden Tan' },
  { value: 57, label: 'Caramel' },
  { value: 64, label: 'Chestnut' },
  { value: 71, label: 'Mocha' },
  { value: 79, label: 'Espresso' },
  { value: 86, label: 'Deep Cocoa' },
  { value: 93, label: 'Rich Ebony' },
  { value: 100, label: 'Midnight' },
] as const;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

function normalizeCategory(category: unknown): string {
  return String(category || '').trim().toLowerCase();
}

function getItemSearchText(item: any): string {
  const tags = Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => String(tag)) : [];
  return [
    String(item?.name || ''),
    String(item?.category || ''),
    String(item?.color || ''),
    String(item?.fabric || ''),
    String(item?.notes || ''),
    ...tags,
  ].join(' ').toLowerCase();
}

function isGymOccasion(occasion: string): boolean { return GYM_OCCASION_PATTERN.test(occasion); }
function isFormalOccasion(occasion: string): boolean { return FORMAL_OCCASION_PATTERN.test(occasion); }
function isBusinessOccasion(occasion: string): boolean { return BUSINESS_OCCASION_PATTERN.test(occasion); }
function isShoe(item: any): boolean { return normalizeCategory(item?.category) === 'shoes'; }
function isBottom(item: any): boolean { return normalizeCategory(item?.category) === 'bottoms'; }
function isTopHalf(item: any): boolean {
  const cat = normalizeCategory(item?.category);
  return cat === 'tops' || cat === 'jumpers';
}

function isGymTop(item: any): boolean {
  if (normalizeCategory(item?.category) !== 'tops') return false;
  const text = getItemSearchText(item);
  if (GYM_TOP_NEGATIVE_PATTERN.test(text)) return false;
  return GYM_TOP_POSITIVE_PATTERN.test(text);
}
function isGymBottom(item: any): boolean {
  if (normalizeCategory(item?.category) !== 'bottoms') return false;
  const text = getItemSearchText(item);
  if (GYM_BOTTOM_NEGATIVE_PATTERN.test(text)) return false;
  return GYM_BOTTOM_POSITIVE_PATTERN.test(text);
}
function isGymShoe(item: any): boolean {
  if (normalizeCategory(item?.category) !== 'shoes') return false;
  const text = getItemSearchText(item);
  return !GYM_SHOE_NEGATIVE_PATTERN.test(text);
}

function getOccasionTier(occasion: string): { tier: string; guidance: string } {
  if (isGymOccasion(occasion)) {
    return { tier: 'ACTIVE/GYM', guidance: 'Athletic wear ONLY. EXACTLY 3 items: (1) one gym top — t-shirt, tight-fit tee, compression top, performance polyester/spandex/nylon top; (2) one gym bottom — shorts, track pants, joggers, lightweight athletic pants; (3) one closed trainer/sneaker. NO jackets, hoodies, jumpers, sweaters, blazers, outerwear, hats, jewellery, bags, sandals, boots, formal shoes.' };
  }
  if (isFormalOccasion(occasion)) {
    return { tier: 'FORMAL', guidance: 'Formal pieces ONLY. Pick suit trousers / dress pants / smart trousers (NEVER jeans, joggers, shorts, athletic). Pair with a dress shirt or smart top, polished dress shoes (Oxfords/derbies/loafers — NEVER trainers/sandals/boots), and a blazer/suit jacket if available. NO hoodies, t-shirts with graphics, hats, trainers, athletic items.' };
  }
  if (isBusinessOccasion(occasion)) {
    return { tier: 'BUSINESS', guidance: 'Smart workwear. Pick chinos, smart trousers, or dark/clean jeans (NEVER joggers, athletic, ripped). Pair with a collared shirt, polo, or fine-knit top, smart shoes or clean leather sneakers. Optional blazer. NO graphic tees, hoodies, athletic wear, sandals.' };
  }
  if (SMART_CASUAL_PATTERN.test(occasion)) {
    return { tier: 'SMART CASUAL', guidance: 'Polished but relaxed. Smart jeans/chinos/trousers, knitwear or smart top, clean sneakers or loafers. Avoid athletic wear and sloppy casual.' };
  }
  if (BEACH_PATTERN.test(occasion)) {
    return { tier: 'BEACH/HOLIDAY', guidance: 'Light, breathable. Shorts or linen trousers, t-shirt or short-sleeve shirt, sandals/slides or canvas sneakers. NO heavy outerwear, wool, dress shoes.' };
  }
  return { tier: 'CASUAL', guidance: 'Relaxed everyday wear. Jeans/chinos/casual trousers, t-shirt/sweatshirt/casual shirt, trainers or casual shoes. Avoid suits, blazers, dress shoes unless user style demands it.' };
}

function normalizeSkinTone(input: unknown): string {
  const raw = String(input || '').trim();
  if (!raw) return 'not specified';
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return SKIN_TONE_LABELS.reduce((closest, stop) => {
      const cd = Math.abs(stop.value - numeric);
      const bd = Math.abs(closest.value - numeric);
      return cd < bd ? stop : closest;
    }, SKIN_TONE_LABELS[0]).label;
  }
  const matched = SKIN_TONE_LABELS.find((stop) => stop.label.toLowerCase() === raw.toLowerCase());
  return matched?.label ?? raw;
}

function dedupeById(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item?.id || '');
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function ensureRequiredCategory(selected: any[], allItems: any[], predicate: (item: any) => boolean, replacementPriority: string[]): any[] {
  const available = allItems.filter(predicate);
  if (available.length === 0 || selected.some(predicate)) return selected;
  const replaceIndex = selected.findIndex((item) => replacementPriority.includes(normalizeCategory(item?.category)));
  if (replaceIndex >= 0) {
    const next = [...selected];
    next[replaceIndex] = available[0];
    return next;
  }
  if (selected.length >= 5) {
    const next = [...selected];
    next[next.length - 1] = available[0];
    return next;
  }
  return [...selected, available[0]];
}

function normalizeSelectionWithRequiredCore(selected: any[], allItems: any[]): any[] {
  let next = dedupeById(selected.filter(Boolean));
  if (next.length === 0 && allItems.length > 0) {
    next = allItems.slice(0, Math.min(4, allItems.length));
  }
  const replacementPriority = ['accessories', 'hats', 'outerwear'];
  next = ensureRequiredCategory(next, allItems, isTopHalf, replacementPriority);
  next = ensureRequiredCategory(next, allItems, isBottom, replacementPriority);
  next = ensureRequiredCategory(next, allItems, isShoe, replacementPriority);
  return dedupeById(next).slice(0, 5);
}

function normalizeSelectionForGym(selected: any[], allItems: any[]): any[] {
  const deduped = dedupeById(selected.filter(Boolean));
  const top = deduped.find(isGymTop) ?? allItems.find(isGymTop);
  const bottom = deduped.find(isGymBottom) ?? allItems.find(isGymBottom);
  const shoes = deduped.find(isGymShoe) ?? allItems.find(isGymShoe);
  return dedupeById([top, bottom, shoes].filter(Boolean)).slice(0, 3);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { occasion, items, userProfile, weather } = await req.json();
    const normalizedSkinTone = normalizeSkinTone(userProfile?.skinTone);

    if (!occasion || typeof occasion !== 'string' || occasion.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid occasion' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 300) {
      return new Response(JSON.stringify({ error: 'Invalid items' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isGymRequest = isGymOccasion(occasion);
    const candidateItems = isGymRequest
      ? items.filter((item: any) => isGymTop(item) || isGymBottom(item) || isGymShoe(item))
      : items;

    if (isGymRequest) {
      if (!candidateItems.some(isGymTop)) {
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require a gym-appropriate top (t-shirt, compression, or performance polyester/spandex top).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!candidateItems.some(isGymBottom)) {
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require a suitable bottom (shorts, lightweight pants, or track pants).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!candidateItems.some(isGymShoe)) {
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require a closed shoe or trainer.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!items.some(isShoe)) {
        return new Response(JSON.stringify({ error: 'At least one shoe item is required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!items.some(isBottom)) {
        return new Response(JSON.stringify({ error: 'At least one bottoms item is required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!items.some(isTopHalf)) {
        return new Response(JSON.stringify({ error: 'At least one tops or jumpers item is required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const occasionTier = getOccasionTier(occasion);

    // Build a richer wardrobe summary so the AI can intelligently pick from many options
    const wardrobeSummary = candidateItems.map((item: any, i: number) => {
      const tags = Array.isArray(item.tags) ? item.tags.slice(0, 8).join(', ') : '';
      const notes = item.notes ? ` | notes: "${String(item.notes).slice(0, 120)}"` : '';
      return `${i + 1}. [${String(item.category || '').toLowerCase()}] "${String(item.name || '').slice(0, 80)}" — colour: ${String(item.color || 'unspecified').slice(0, 30)}, fabric: ${String(item.fabric || 'unspecified').slice(0, 30)}${tags ? `, tags: [${tags}]` : ''}${notes}`;
    }).join('\n');

    const systemPrompt = `You are a senior personal fashion stylist with 30 years of experience dressing real people for real occasions. Your job is to build a sensible, flattering, occasion-appropriate outfit from the user's actual wardrobe. You think like a stylist, not a robot.

## OCCASION TIER (locked in for this request)
**${occasionTier.tier}** — ${occasionTier.guidance}

## NON-NEGOTIABLE RULES
1. The outfit MUST match the occasion tier above. Never put gym wear at a wedding, never put a blazer at the gym, never put dress shoes at the beach.
2. The outfit MUST include exactly: 1 top (or jumper), 1 bottom, 1 pair of shoes — at minimum. Add outerwear/hat/accessory ONLY if it enhances the look and fits the occasion.
3. For ACTIVE/GYM: return EXACTLY 3 items (top + bottom + shoes) — no exceptions.
4. Pick items that genuinely make sense together. If the user has 10 pairs of pants, choose the ONE that best fits the occasion (e.g. track pants for gym, suit trousers for wedding, dark jeans for date night).
5. Colour harmony matters: build a deliberate palette (2–3 colours max), avoid clashing.
6. Fabric/weather: heavier fabrics for cold weather, lightweight breathable for warm. Match formality of fabric to occasion.

## SKIN TONE FLATTERY
Use the user's skin tone to pick colours that genuinely flatter:
- Porcelain/Ivory/Light Beige: navy, burgundy, forest green, soft pink, charcoal
- Warm Beige/Golden Beige/Honey: olive, terracotta, camel, cream, rust, jewel tones
- Golden Tan/Caramel/Chestnut: cobalt, magenta, orange, gold, teal, white
- Mocha/Espresso/Deep Cocoa/Rich Ebony/Midnight: bold brights (red, royal blue, fuchsia), pastels, white, metallics

## STYLE PREFERENCE
Strongly favour items matching the user's stated style. A minimalist user gets clean lines and neutral palettes; a streetwear user gets relaxed fits and statement pieces; a classic user gets timeless silhouettes.

## REASONING (shown to user as "WHY THIS WORKS")
Write 4–6 specific sentences. Reference the actual items chosen, the actual colours, the actual fabrics, the user's skin tone (using its descriptive name, not a number), the weather (if provided), and how it fits their style. NEVER use vague filler like "a curated look" or "complementary pieces". Speak like a real stylist explaining their choices to a client.`;

    const userPrompt = `Build the best outfit for: "${occasion}"
Occasion tier: ${occasionTier.tier}
${weather ? `Weather: ${weather.temp}°C, ${weather.description} — factor this in.\n` : ''}
${userProfile ? `User profile:
- Skin tone: ${normalizedSkinTone} (USE for colour flattery)
- Style preference: ${userProfile.stylePreference || 'not specified'} (CRITICAL: match closely)
- Body type: ${userProfile.bodyType || 'not specified'}
- Preferred colours: ${(userProfile.preferredColors || []).join(', ') || 'not specified'}
- Fashion goal: ${userProfile.fashionGoals || 'not specified'}
` : ''}
WARDROBE (${candidateItems.length} items):
${wardrobeSummary}

Pick the items by their 1-based index. ${isGymRequest ? 'Return EXACTLY 3 items (gym top + gym bottom + closed trainer).' : 'Return 3–5 items that genuinely work together.'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 4096,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_outfit',
              description: 'Create a curated outfit from wardrobe items',
              parameters: {
                type: 'object',
                properties: {
                  selected_indices: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: '1-based indices of selected wardrobe items',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Detailed 4–6 sentence stylist explanation referencing actual items, colours, fabrics, the user\'s skin tone (by name), the weather, and their style. No generic filler.',
                  },
                  style_tips: {
                    type: 'string',
                    description: 'One quick styling tip for wearing this outfit.',
                  },
                },
                required: ['selected_indices', 'reasoning', 'style_tips'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_outfit' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call in response');

    const result = JSON.parse(toolCall.function.arguments);

    const rawSelectedIndices = Array.isArray(result.selected_indices) ? result.selected_indices : [];
    const parsedSelectedItems = rawSelectedIndices
      .map((idx: unknown) => Number(idx))
      .filter((idx: number) => Number.isInteger(idx) && idx >= 1 && idx <= candidateItems.length)
      .map((idx: number) => candidateItems[idx - 1]);

    const selectedItems = isGymRequest
      ? normalizeSelectionForGym(parsedSelectedItems, candidateItems)
      : normalizeSelectionWithRequiredCore(parsedSelectedItems, candidateItems);

    return new Response(JSON.stringify({
      items: selectedItems,
      reasoning: result.reasoning,
      style_tips: result.style_tips,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-outfit error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
