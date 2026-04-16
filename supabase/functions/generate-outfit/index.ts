import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
];

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const wardrobeSummary = items.map((item: any, i: number) => 
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
            content: `You are a world-class personal fashion stylist AI. You do NOT pick items randomly. You carefully analyse every item's color, fabric, category, and the user's profile to build a truly intentional outfit.

## OCCASION RULES (CRITICAL — follow strictly)
Classify the occasion into one of these tiers and apply the rules:

**FORMAL / BUSINESS / BLACK-TIE / INTERVIEW / WEDDING:**
- Prioritise suits, blazers, dress shirts, tailored trousers, dress shoes, loafers.
- Colors: navy, charcoal, black, white, burgundy, cream. Muted and refined.
- NEVER select: trainers/sneakers, hoodies, graphic tees, caps/beanies, ripped jeans, joggers, casual shorts.
- Accessories: watches, belts, ties, pocket squares, cufflinks only.

**SMART-CASUAL / DATE NIGHT / DINNER:**
- Chinos, smart trousers, polo shirts, knit jumpers, clean sneakers or loafers.
- Colors: earth tones, navy, olive, cream, soft pastels. Slightly relaxed but polished.
- Avoid: sportswear, heavily branded streetwear, flip-flops.

**CASUAL / DAY OUT / WEEKEND / ERRANDS:**
- Jeans, tees, hoodies, casual jackets, trainers, shorts in warm weather.
- Colors: flexible — follow the user's style preference and skin tone.
- Suits and blazers should NOT be recommended here unless the user's style is specifically "old-money" or "elegant".

**SPORTY / GYM / ACTIVE:**
- Athletic wear, joggers, performance fabrics, trainers.
- Skip formal or delicate items entirely.

**STREETWEAR / FESTIVAL / CREATIVE:**
- Bold colours, layering, statement pieces, chunky footwear.
- Embrace contrast and self-expression.

## COLOR MATCHING GUIDE
Use these complementary color pairings as guidance (not rigid rules):
- **Black** pairs with: dark red/burgundy, navy, grey, white, light blue
- **Navy** pairs with: black, beige/tan, grey, white
- **Grey** pairs with: black, pink, white, burgundy
- **Beige/Tan** pairs with: black, navy, dark green, white
- **White** pairs with: black, beige, grey, navy, dark green — virtually everything
- **Dark green** pairs with: black, navy, brown/tan, yellow, dark red
- **Blue** pairs with: black, beige, yellow, white, light blue
- **Light blue** pairs with: black, navy, pink, yellow, beige
- **Burgundy/Maroon** pairs with: black, navy, grey, beige, pink
- **Red** pairs with: black, grey, navy, white
- **Orange** pairs with: black, yellow, grey, white
- **Yellow** pairs with: black, green, grey, beige
- **Pink** pairs with: black, navy, grey, blue, white

AVOID clashing: red+green (unless muted), orange+pink, bright yellow+bright red, neon combinations.
Prefer monochromatic (shades of one colour), analogous (adjacent on colour wheel), or complementary pairings.

## SKIN TONE COLOR FLATTERY
If the user's skin tone is provided, use it to select flattering colours:
- **Fair/Light**: jewel tones (emerald, sapphire, ruby), navy, soft pastels, avoid washing out with pale yellow or beige.
- **Medium/Olive**: earth tones (olive, terracotta, camel), warm reds, teal, cream.
- **Tan/Brown**: rich colours (burgundy, mustard, forest green, burnt orange, cobalt blue), bright whites.
- **Dark/Deep**: bold and vibrant colours (royal blue, bright red, emerald, gold, crisp white), pastels can pop beautifully.

## FABRIC PAIRING
- Pair structured with structured (wool blazer + cotton chinos) or soft with soft (knit jumper + linen trousers).
- Avoid denim-on-denim unless it's intentional (different washes).
- Silk and satin are formal; denim and jersey are casual — don't cross these without reason.
- Leather jackets pair with cotton/denim, not with silk or formal wool.

## STYLE PREFERENCE
If the user has a style preference (e.g., minimalist, streetwear, old-money, vintage), the outfit MUST align with that aesthetic. This overrides general rules when there's a conflict.

## DECISION PROCESS
1. Read the occasion → determine formality tier.
2. Filter items by occasion-appropriateness (eliminate unsuitable categories).
3. From remaining items, find a colour-harmonious combination using the guide above + skin tone.
4. Check fabric compatibility.
5. Verify style cohesion with user's stated preference.
6. Select 2-5 items. Always include: 1 top-half item, 1 bottoms, 1 shoes.

Always pick items that genuinely look great together. Explain your reasoning with fashion expertise.`,
          },
          {
            role: 'user',
            content: `Create the best possible outfit for the occasion: "${occasion}"
${weather ? `
Current weather: ${weather.temp}°C, ${weather.description}. Factor this into your outfit choices — suggest weather-appropriate layers, fabrics, and styles.
` : ''}
${userProfile ? `
User profile (USE THIS — do not ignore):
- Skin tone: ${userProfile.skinTone || 'not specified'} — use this to pick flattering colours
- Style preference: ${userProfile.stylePreference || 'not specified'} — the outfit MUST match this aesthetic
- Body type: ${userProfile.bodyType || 'not specified'} — consider proportions
- Preferred color palettes: ${(userProfile.preferredColors || []).join(', ') || 'not specified'}
- Fashion goal: ${userProfile.fashionGoals || 'not specified'}
` : ''}
Available wardrobe items:
${wardrobeSummary}

INSTRUCTIONS:
1. First determine the formality level of "${occasion}".
2. Eliminate items that are inappropriate for this formality level.
3. From the remaining items, select 2-5 that create a colour-harmonious, fabric-compatible, style-cohesive outfit.
4. Reference the user's skin tone and style preference in your reasoning.

MANDATORY: Every outfit MUST include at least one top, one bottoms item, and exactly one pair of shoes.`,
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
                    description: 'Fashion expert explanation of why these pieces work together, referencing color theory, fabric compatibility, occasion fit, and overall style cohesion. 2-4 sentences.',
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
    const selectedItems = normalizeSelectionWithRequiredCore(
      rawSelectedIndices
        .map((idx: unknown) => Number(idx))
        .filter((idx: number) => Number.isInteger(idx) && idx >= 1 && idx <= items.length)
        .map((idx: number) => items[idx - 1]),
      items
    );

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
