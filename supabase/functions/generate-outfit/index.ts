import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
];

const GYM_OCCASION_PATTERN = /\b(gym|workout|training|exercise|fitness)\b/i;
const GYM_TOP_POSITIVE_PATTERN = /\b(t-?shirt|tee|compression|activewear|athletic|performance|training|workout|gym|sport|sports|polyester|spandex|elastane|nylon|dry[-\s]?fit|moisture[-\s]?wicking|tight(?:-?fitting)?|fitted)\b/i;
const GYM_TOP_NEGATIVE_PATTERN = /\b(jacket|coat|hoodie|jumper|sweater|cardigan|blazer|outerwear|parka|puffer|fleece|windbreaker|flannel|dress shirt|button[-\s]?up|oxford|knit|wool)\b/i;
const GYM_BOTTOM_POSITIVE_PATTERN = /\b(shorts?|track ?pants?|trackpants?|joggers?|training pants?|workout pants?|athletic|performance|training|workout|gym|sport|sports|lightweight|polyester|spandex|elastane|nylon)\b/i;
const GYM_BOTTOM_NEGATIVE_PATTERN = /\b(jeans?|denim|chinos?|slacks?|trousers?|dress pants?|formal|corduroy|cargo|skirt|wool)\b/i;
const GYM_SHOE_NEGATIVE_PATTERN = /\b(sandals?|slides?|flip[-\s]?flops?|heels?|boots?|loafers?|oxfords?|derbies?|brogues?|mules?|slippers?)\b/i;

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

function isGymOccasion(occasion: string): boolean {
  return GYM_OCCASION_PATTERN.test(occasion);
}

function isShoe(item: any): boolean {
  return normalizeCategory(item?.category) === 'shoes';
}

function isBottom(item: any): boolean {
  return normalizeCategory(item?.category) === 'bottoms';
}

function isTopHalf(item: any): boolean {
  const cat = normalizeCategory(item?.category);
  return cat === 'tops' || cat === 'jumpers';
}

function isGymTop(item: any): boolean {
  if (normalizeCategory(item?.category) !== 'tops') return false;
  const text = getItemSearchText(item);
  if (GYM_TOP_NEGATIVE_PATTERN.test(text)) return false;
  return GYM_TOP_POSITIVE_PATTERN.test(text) || true;
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

function ensureRequiredCategory(
  selected: any[],
  allItems: any[],
  predicate: (item: any) => boolean,
  replacementPriority: string[]
): any[] {
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
    // Auth check
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

    // Input validation
    if (!occasion || typeof occasion !== 'string' || occasion.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid occasion' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
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
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require at least one gym-appropriate top such as a t-shirt, tight-fitting t-shirt, compression top, or performance polyester/spandex top.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!candidateItems.some(isGymBottom)) {
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require at least one suitable bottom such as shorts, lightweight pants, or track pants.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!candidateItems.some(isGymShoe)) {
        return new Response(JSON.stringify({ error: 'Gym/workout outfits require at least one normal closed shoe or trainer.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!items.some(isShoe)) {
        return new Response(JSON.stringify({ error: 'At least one shoe item is required to generate an outfit.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!items.some(isBottom)) {
        return new Response(JSON.stringify({ error: 'At least one bottoms item is required to generate an outfit.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!items.some(isTopHalf)) {
        return new Response(JSON.stringify({ error: 'At least one tops or jumpers item is required to generate an outfit.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const wardrobeSummary = candidateItems.map((item: any, i: number) => 
      `${i + 1}. \"${String(item.name || '').slice(0, 100)}\" — ${String(item.category || '').slice(0, 50)}, ${String(item.color || '').slice(0, 30)}, ${String(item.fabric || '').slice(0, 30)}, tags: [${(item.tags || []).slice(0, 10).join(', ')}]${item.notes ? `, user notes: \"${String(item.notes).slice(0, 200)}\"` : ''}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a world-class fashion stylist AI. You MUST follow this strict decision process:

## STEP 1: CLASSIFY THE OCCASION
Determine the formality tier:
- **FORMAL** (black-tie, gala, wedding guest): Suits, dress shirts, polished shoes only. NO hats, caps, trainers, hoodies, or casual items.
- **BUSINESS** (meeting, interview, office): Smart trousers/chinos, blazers, dress shoes, collared shirts. Muted, refined colours. NO streetwear, graphic tees, or casual trainers.
- **SMART CASUAL** (dinner, date night, brunch): Mix of polished and relaxed — smart jeans, loafers, knitwear, clean sneakers acceptable.
- **CASUAL** (day out, errands, weekend): Relaxed fits, t-shirts, jeans, trainers, hoodies all fine. NO suits or blazers unless the user's style is specifically formal.
- **ACTIVE/GYM** (gym, workout, sports, hiking): Athletic wear ONLY. For gym/workout specifically, you must select EXACTLY 3 items: (1) one top from T-shirts, tight-fitting T-shirts, compression tops, or performance polyester/spandex/nylon tops; (2) one bottom from shorts, lightweight pants, track pants, or joggers; and (3) one pair of normal closed trainers/sneakers/gym shoes. NO jackets, NO hoodies, NO jumpers, NO sweaters, NO outerwear, NO layering, NO thick or warm clothes, NO hats, NO jewellery, NO bags, NO accessories, NO sandals, NO boots, NO formal shoes.

## STEP 2: ELIMINATE INAPPROPRIATE ITEMS
Before selecting, mentally remove ALL items that clash with the occasion tier. E.g. for BUSINESS: remove graphic tees, joggers, flip-flops, bucket hats. For CASUAL: deprioritise suits, ties, formal shoes. For ACTIVE/GYM: remove anything that is not a gym top, lightweight gym bottom, or normal closed gym shoe.

## STEP 3: MATCH THE USER'S SKIN TONE (if provided)
Use these flattering colour guidelines:
- **Fair/Light skin**: Navy, burgundy, forest green, soft pink, charcoal. Avoid washing out with pastels or stark white.
- **Medium/Olive skin**: Earth tones (olive, terracotta, camel), jewel tones (emerald, sapphire), cream, rust.
- **Tan/Brown skin**: Rich colours (cobalt blue, magenta, orange, gold, teal). White and cream look striking.
- **Dark/Deep skin**: Bold brights (red, yellow, royal blue, fuchsia), pastels (lavender, soft pink), white, metallics.

## STEP 4: COLOUR HARMONY
Follow these pairing rules (use as guidance, not gospel):
- **Black** pairs with: dark red/maroon, navy, grey, white, light blue
- **Navy** pairs with: black, beige/tan, grey, yellow, white
- **Grey** pairs with: black, pink, white, blue, burgundy
- **Beige/Tan** pairs with: black, navy, green, brown, white
- **White** pairs with: everything, especially navy, black, green, blue
- **Green** pairs with: black, navy, brown, yellow, white
- **Blue** pairs with: black, yellow, white, light blue, grey
- **Light blue** pairs with: black, navy, pink, dark red, grey, beige
- **Burgundy/Maroon** pairs with: black, grey, pink, white, beige
- **Red** pairs with: black, navy, grey, white, green
- **Orange** pairs with: black, light blue, grey, yellow, white
- **Yellow** pairs with: black, green, grey, white, beige
- **Pink** pairs with: black, navy, grey, white, blue
Avoid clashing combinations (e.g. red+orange, navy+black in casual contexts, brown+black unless intentional).

## STEP 5: FABRIC & TEXTURE COMPATIBILITY
- Don't pair denim with denim unless intentionally styled
- Mix textures: knit with cotton, wool with silk, leather with denim
- Match fabric weight to weather/occasion
- For ACTIVE/GYM, prioritise breathable, flexible, lightweight performance fabrics.

## STEP 6: STYLE PREFERENCE ALIGNMENT
If the user has a style preference (e.g. streetwear, minimalist, classic, preppy), STRONGLY favour items matching that aesthetic. A minimalist user shouldn't get loud patterns; a streetwear user shouldn't get formal blazers for casual occasions.

## STEP 7: SELECT 2-5 ITEMS
Build the outfit prioritising: 1 top, 1 bottom, 1 pair of shoes minimum. Add outerwear/accessories only if they genuinely enhance the outfit.
For ACTIVE/GYM, override this and select EXACTLY 3 items only: 1 gym top + 1 gym bottom + 1 pair of closed gym shoes.

## STEP 8: WRITE THE "WHY THIS WORKS" EXPLANATION
Your reasoning is shown directly to the user and must read like a premium personal stylist speaking to them.
- Write 4-6 full sentences and make it specific, not generic.
- Explicitly explain why the chosen colours flatter the user's skin tone if skin tone is provided.
- Explicitly explain why the fabrics and textures suit both the occasion and the weather.
- Explicitly explain why the colours work together using the actual colours selected.
- Explicitly explain how the outfit matches the user's stated style preference.
- Name the actual selected items, colours, and fabrics where relevant.
- NEVER write vague filler like "a curated look", "complementary pieces", "works well together", or "stylish choice" without giving a real reason.
- If the explanation sounds generic, rewrite it until it feels personal and concrete.`,
          },
          {
            role: 'user',
            content: `Create the best possible outfit for the occasion: "${occasion}"
${weather ? `\nCurrent weather: ${weather.temp}\u00B0C, ${weather.description}. Factor this into your outfit choices.\n` : ''}
${userProfile ? `
User profile:
- Skin tone: ${userProfile.skinTone || 'not specified'} (USE THIS for colour flattery — see skin tone guidelines)
- Style preference: ${userProfile.stylePreference || 'not specified'} (CRITICAL: match this style closely!)
- Body type: ${userProfile.bodyType || 'not specified'}
- Preferred colour palettes: ${(userProfile.preferredColors || []).join(', ') || 'not specified'}
- Fashion goal: ${userProfile.fashionGoals || 'not specified'}
` : ''}
Available wardrobe items:
${wardrobeSummary}

Follow the 8-step decision process. First classify the occasion, then eliminate inappropriate items, then build a colour-harmonious outfit that flatters the user's skin tone and matches their style preference. Use their index numbers (1-based).

The "reasoning" output is displayed in a WHY THIS WORKS section in the app, so it must be polished, user-facing, and detailed. Mention the user's skin tone or complexion if available, the actual colours chosen, the fabrics relative to the occasion and weather, and why the look fits their style preference. Do not use generic filler.

MANDATORY: Every outfit MUST include at least one bottoms item and exactly one pair of shoes. If the occasion is gym/workout, you MUST return exactly 3 items only: 1 gym top, 1 lightweight gym bottom, and 1 pair of normal closed gym shoes. Never return jackets, jumpers, hoodies, outerwear, accessories, or layered pieces for gym/workout.`,
          },
        ],
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
                    description: 'The 1-based indices of selected wardrobe items',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Detailed explanation (4-6 sentences) of WHY this outfit works. MUST specifically address: (1) how the chosen colours complement the user\'s skin tone (reference the specific skin tone if provided), (2) why the fabrics/textures are appropriate for the occasion and current weather conditions, (3) how the colour palette creates harmony (reference specific colour pairings), (4) how the overall look aligns with the user\'s style preference. Be personal and specific — never generic filler. Example: "The navy wool blazer pairs beautifully with your olive skin tone, bringing out warm undertones. The cotton Oxford shirt in light blue creates a classic contrast against the navy..."',
                  },
                  style_tips: {
                    type: 'string',
                    description: 'One quick styling tip for wearing this outfit (e.g., "Roll the sleeves for a relaxed vibe" or "Tuck in the shirt to elongate your silhouette").',
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