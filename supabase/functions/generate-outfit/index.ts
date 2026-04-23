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
const ATHLETIC_SHOE_PATTERN = /\b(TN|TNs|air ?max|air ?force|running shoe|trail shoe|training shoe|gym shoe|sports shoe|basketball shoe|trainer|trainers|jogger shoe|tech runner|boost|ultra ?boost|foam ?runner)\b/i;
const GYM_WEAR_ITEM_PATTERN = /\b(compression|activewear|athletic wear|performance top|training top|workout top|gym top|sports top|spandex|elastane|dry[-\s]?fit|moisture[-\s]?wicking)\b/i;
const HEAVY_OUTERWEAR_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|winter coat|heavy coat|fur|shearling|down jacket|anorak|peacoat|overcoat|trench coat|duffel coat|toggle coat|wool coat)\b/i;
const WATERPROOF_PATTERN = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex|mac|mackintosh|cagoule|pac[-\s]?a[-\s]?mac|hardshell)\b/i;
const COLD_THRESHOLD = 10;
const HOT_THRESHOLD = 25;
const RAINY_PATTERN = /\b(rain|rainy|drizzle|shower|showers|wet|precipitation|storm|stormy|downpour)\b/i;


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

function isHatCategory(item: any): boolean {
  const cat = normalizeCategory(item?.category);
  return cat === 'hats' || cat === 'hat';
}

function isAthleticShoe(item: any): boolean {
  if (normalizeCategory(item?.category) !== 'shoes') return false;
  return ATHLETIC_SHOE_PATTERN.test(getItemSearchText(item));
}

function isGymWearItem(item: any): boolean {
  const cat = normalizeCategory(item?.category);
  if (cat !== 'tops' && cat !== 'bottoms') return false;
  return GYM_WEAR_ITEM_PATTERN.test(getItemSearchText(item));
}

function filterItemsForOccasion(items: any[], occasion: string): any[] {
  if (isFormalOccasion(occasion) || isBusinessOccasion(occasion)) {
    return items.filter(item => !isHatCategory(item) && !isAthleticShoe(item) && !isGymWearItem(item));
  }
  // Smart casual and casual: allow hats and non-gym shoes but strip gym-specific clothing
  return items.filter(item => !isGymWearItem(item));
}

function isOuterwearCategory(item: any): boolean {
  return normalizeCategory(item?.category) === 'outerwear';
}

function isHeavyOuterwear(item: any): boolean {
  if (!isOuterwearCategory(item)) return false;
  return HEAVY_OUTERWEAR_PATTERN.test(getItemSearchText(item));
}

function isWaterproofOuterwear(item: any): boolean {
  return WATERPROOF_PATTERN.test(getItemSearchText(item));
}

function isRainyWeather(weather: { description: string }): boolean {
  return RAINY_PATTERN.test(weather.description);
}

function getWeatherDirective(weather: { temp: number; description: string }, occasion: string): string {
  const rainy = isRainyWeather(weather);
  const cold = weather.temp < COLD_THRESHOLD;
  const hot = weather.temp > HOT_THRESHOLD;

  if (cold && rainy) {
    return `WEATHER REQUIREMENT (MANDATORY): It is cold and rainy (${weather.temp}°C, ${weather.description}). You MUST include a waterproof outer layer — a rain jacket, waterproof coat, or windbreaker. Also include warm fabrics (wool, knit, fleece). This is required regardless of occasion.`;
  }
  if (cold) {
    return `WEATHER REQUIREMENT (MANDATORY): It is cold (${weather.temp}°C, ${weather.description}). You MUST include a jacket, coat, or outerwear. Favour warm fabrics (wool, knit, fleece, padded). This is non-negotiable — an outfit without outerwear is wrong for this weather.`;
  }
  if (rainy) {
    return `WEATHER REQUIREMENT (MANDATORY): It is rainy (${weather.temp}°C, ${weather.description}). You MUST include a waterproof outer layer — rain jacket, windbreaker, or waterproof coat. Do not skip outerwear even if it is mild.`;
  }
  if (hot) {
    const hatNote = !isFormalOccasion(occasion) && !isBusinessOccasion(occasion)
      ? ' A hat or sunglasses for sun protection is a good addition if available.'
      : '';
    return `WEATHER: Hot (${weather.temp}°C, ${weather.description}). Prioritise lightweight, breathable fabrics (linen, cotton, light jersey). NO heavy coats, puffers, thick jackets, or wool layers.${hatNote}`;
  }
  // Mild
  return `WEATHER: Mild (${weather.temp}°C, ${weather.description}). Light layering is fine. A light jacket is optional but not required.`;
}

function filterItemsForWeather(items: any[], weather: { temp: number; description: string }, occasion: string): any[] {
  if (weather.temp > HOT_THRESHOLD) {
    if (isFormalOccasion(occasion) || isBusinessOccasion(occasion)) {
      // Hot formal/business: keep blazers and light jackets, strip heavy coats only
      return items.filter(item => !isHeavyOuterwear(item));
    }
    // Hot casual/smart casual: strip all outerwear
    return items.filter(item => !isOuterwearCategory(item));
  }
  return items;
}

function normalizeSelectionForWeather(
  selected: any[],
  allCandidates: any[],
  weather: { temp: number; description: string } | undefined,
  isGym: boolean
): any[] {
  if (!weather || isGym) return selected;

  let result = [...selected];
  const cold = weather.temp < COLD_THRESHOLD;
  const rainy = isRainyWeather(weather);
  const hot = weather.temp > HOT_THRESHOLD;

  // Hot: strip heavy outerwear that slipped through
  if (hot) {
    return dedupeById(result.filter(item => !isHeavyOuterwear(item)));
  }

  // Cold or rainy: ensure outerwear is present
  if (cold || rainy) {
    const hasOuterwear = result.some(isOuterwearCategory);
    const outerwearPool = allCandidates.filter(isOuterwearCategory);

    if (!hasOuterwear && outerwearPool.length > 0) {
      // Prefer waterproof if rainy, otherwise first available
      const inject = rainy
        ? (outerwearPool.find(isWaterproofOuterwear) ?? outerwearPool[0])
        : outerwearPool[0];

      // Replace accessories/hats first, then add if room, then replace last item
      const replaceIdx = result.findIndex(item => {
        const cat = normalizeCategory(item?.category);
        return cat === 'accessories' || cat === 'hats';
      });
      if (replaceIdx >= 0) {
        result = [...result];
        result[replaceIdx] = inject;
      } else if (result.length < 5) {
        result = [...result, inject];
      } else {
        result = [...result];
        result[result.length - 1] = inject;
      }
    } else if (rainy && hasOuterwear) {
      // Has outerwear but check it's waterproof
      const hasWaterproof = result.some(isWaterproofOuterwear);
      if (!hasWaterproof) {
        const waterproofItem = allCandidates.find(item => isOuterwearCategory(item) && isWaterproofOuterwear(item));
        if (waterproofItem) {
          const replaceIdx = result.findIndex(item => isOuterwearCategory(item) && !isWaterproofOuterwear(item));
          if (replaceIdx >= 0) {
            result = [...result];
            result[replaceIdx] = waterproofItem;
          }
        }
      }
    }
  }

  return dedupeById(result);
}

function getOccasionTier(occasion: string): { tier: string; guidance: string } {
  if (isGymOccasion(occasion)) {
    return { tier: 'ACTIVE/GYM', guidance: 'Athletic wear ONLY. EXACTLY 3 items: (1) one gym top — t-shirt, tight-fit tee, compression top, performance polyester/spandex/nylon top; (2) one gym bottom — shorts, track pants, joggers, lightweight athletic pants; (3) one closed trainer/sneaker. NO jackets, hoodies, jumpers, sweaters, blazers, outerwear, hats, jewellery, bags, sandals, boots, formal shoes.' };
  }
  if (isFormalOccasion(occasion)) {
    return { tier: 'FORMAL', guidance: 'Formal pieces ONLY. Pick suit trousers / dress pants / smart trousers (NEVER jeans, joggers, shorts, athletic). Pair with a dress shirt or smart top, polished dress shoes (Oxfords/derbies/loafers — NEVER trainers/sandals/boots/athletic footwear), and a blazer/suit jacket if available. NO hoodies, t-shirts with graphics, hats, caps, headwear, trainers, sneakers, or any athletic items.' };
  }
  if (isBusinessOccasion(occasion)) {
    return { tier: 'BUSINESS', guidance: 'Smart professional workwear ONLY. Pick chinos, smart trousers, or dark/clean jeans (NEVER joggers, athletic bottoms, ripped). Pair with a collared shirt, polo, or fine-knit top. Shoes must be smart leather shoes, loafers, derbies, or clean minimal dress sneakers — NEVER trainers, running shoes, TNs, Air Max, Jordans, or any athletic or sport-branded footwear. NO hats, caps, beanies, or any headwear. NO graphic tees, hoodies, athletic wear, sandals, or streetwear.' };
  }
  if (SMART_CASUAL_PATTERN.test(occasion)) {
    return { tier: 'SMART CASUAL', guidance: 'Polished but relaxed. Smart jeans/chinos/trousers, knitwear or smart top, clean sneakers or loafers. Avoid athletic wear and sloppy casual.' };
  }
  if (BEACH_PATTERN.test(occasion)) {
    return { tier: 'BEACH/HOLIDAY', guidance: 'Light, breathable. Shorts or linen trousers, t-shirt or short-sleeve shirt, sandals/slides or canvas sneakers. NO heavy outerwear, wool, dress shoes.' };
  }
  return { tier: 'CASUAL', guidance: 'Relaxed everyday wear. Jeans/chinos/casual trousers, t-shirt/sweatshirt/casual shirt, trainers or casual shoes. Avoid suits, blazers, dress shoes unless user style demands it.' };
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

    const { occasion, items, userProfile, weather, recentOutfitItemIds, colourStory } = await req.json();

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
    const occasionFiltered = isGymRequest
      ? items.filter((item: any) => isGymTop(item) || isGymBottom(item) || isGymShoe(item))
      : filterItemsForOccasion(items, occasion);
    const candidateItems = (!isGymRequest && weather)
      ? filterItemsForWeather(occasionFiltered, weather, occasion)
      : occasionFiltered;

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

    // Collect item IDs used in the most recent outfit for inline marking
    const lastOutfitIds = new Set<string>(
      Array.isArray(recentOutfitItemIds) && recentOutfitItemIds.length > 0
        ? (Array.isArray(recentOutfitItemIds[0]) ? recentOutfitItemIds[0] : []).map(String)
        : []
    );

    // Build a richer wardrobe summary so the AI can intelligently pick from many options
    const wardrobeSummary = candidateItems.map((item: any, i: number) => {
      const tags = Array.isArray(item.tags) ? item.tags.slice(0, 8).join(', ') : '';
      const notes = item.notes ? ` | notes: "${String(item.notes).slice(0, 120)}"` : '';
      const usedMarker = lastOutfitIds.has(String(item.id)) ? ' ⚠️ USED IN LAST OUTFIT — pick something else if possible' : '';
      return `${i + 1}. [${String(item.category || '').toLowerCase()}] "${String(item.name || '').slice(0, 80)}" — colour: ${String(item.color || 'unspecified').slice(0, 30)}, fabric: ${String(item.fabric || 'unspecified').slice(0, 30)}${tags ? `, tags: [${tags}]` : ''}${notes}${usedMarker}`;
    }).join('\n');

    const recentOutfitIndices = Array.isArray(recentOutfitItemIds)
      ? recentOutfitItemIds
          .slice(0, 5)
          .map((idSet: string[]) =>
            (Array.isArray(idSet) ? idSet : [])
              .map((id: string) => candidateItems.findIndex((item: any) => String(item.id) === String(id)) + 1)
              .filter((idx: number) => idx > 0)
          )
          .filter((indices: number[]) => indices.length >= 2)
      : [];

    const avoidanceSection = recentOutfitIndices.length > 0
      ? `RECENT OUTFITS — do NOT recreate these exact item combinations. Look beyond them to explore the full wardrobe:\n${recentOutfitIndices.map((indices: number[], i: number) => `- Recent outfit ${i + 1}: wardrobe positions [${indices.join(', ')}]`).join('\n')}\n`
      : '';

    const colourStoryDirective = (colourStory && colourStory !== 'surprise')
      ? `COLOUR STORY (required for this outfit): ${String(colourStory).replace(/-/g, ' ').toUpperCase()}. Only select items whose colours fit this palette. Name this choice in your reasoning.\n`
      : `COLOUR STORY: Your choice — pick whichever palette approach fits best (tonal, neutral-anchor, analogous, complementary, or monochromatic). Name your choice in the reasoning.\n`;

    const systemPrompt = `You are a senior personal fashion stylist with 30 years of experience dressing real people for real occasions. Your job is to build a sensible, flattering, occasion-appropriate outfit from the user's actual wardrobe. You think like a stylist, not a robot.

## OCCASION TIER (locked in for this request)
**${occasionTier.tier}** — ${occasionTier.guidance}

## NON-NEGOTIABLE RULES
1. The outfit MUST match the occasion tier above. Never put gym wear at a wedding, never put a blazer at the gym, never put dress shoes at the beach.
2. The outfit MUST include exactly: 1 top (or jumper), 1 bottom, 1 pair of shoes — at minimum. Add outerwear/hat/accessory ONLY if it enhances the look and fits the occasion.
3. For ACTIVE/GYM: return EXACTLY 3 items (top + bottom + shoes) — no exceptions.
4. Pick items that genuinely make sense together. If the user has 10 pairs of pants, choose the ONE that best fits the occasion (e.g. track pants for gym, suit trousers for wedding, dark jeans for date night).
5. COLOUR COORDINATION — before selecting any item, decide on a colour story, then only choose pieces whose colours fit it:
   - TONAL: shades of the same colour family (e.g. all navy/blue tones, all camel/tan/brown).
   - NEUTRAL ANCHOR: 2+ neutrals (black/white/grey/navy/beige/camel) as base, one accent colour max.
   - ANALOGOUS: colours adjacent on the wheel (e.g. blue + green + teal, orange + red + rust).
   - COMPLEMENTARY: colours opposite on the wheel (e.g. navy + tan, burgundy + olive, cobalt + rust).
   - MONOCHROMATIC: one colour across all pieces in different shades (e.g. all black, all white, all grey).
   Always name the colour story in your reasoning. Never randomly pick items hoping the colours work.
6. Fabric/weather: heavier fabrics for cold weather, lightweight breathable for warm. Match formality of fabric to occasion.

## STYLE PREFERENCE
Strongly favour items matching the user's stated style. A minimalist user gets clean lines and neutral palettes; a streetwear user gets relaxed fits and statement pieces; a classic user gets timeless silhouettes.

## REASONING (shown to user as "WHY THIS WORKS")
Write 4–6 specific sentences. Reference the actual items chosen, the actual colours, the actual fabrics, the weather (if provided), and how it fits their style. NEVER use vague filler like "a curated look" or "complementary pieces". Speak like a real stylist explaining their choices to a client.`;

    const userPrompt = `Build the best outfit for: "${occasion}"
Occasion tier: ${occasionTier.tier}
${weather ? `${getWeatherDirective(weather, occasion)}\n` : ''}${colourStoryDirective}${avoidanceSection}${userProfile ? `User profile:
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

    const coreNormalized = isGymRequest
      ? normalizeSelectionForGym(parsedSelectedItems, candidateItems)
      : normalizeSelectionWithRequiredCore(parsedSelectedItems, candidateItems);
    const selectedItems = normalizeSelectionForWeather(coreNormalized, candidateItems, weather, isGymRequest);

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
