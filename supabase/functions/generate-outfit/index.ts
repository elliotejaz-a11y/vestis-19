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

function isDress(item: any): boolean {
  return normalizeCategory(item?.category) === 'dresses';
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

  const hasDress = next.some(isDress);
  const replacementPriority = ['accessories', 'hats', 'outerwear'];

  // If a dress is selected, top and bottom are not required
  if (!hasDress) {
    next = ensureRequiredCategory(next, allItems, isTopHalf, replacementPriority);
    next = ensureRequiredCategory(next, allItems, isBottom, replacementPriority);
  }
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

    const hasDress = items.some(isDress);

    if (!items.some(isShoe)) {
      return new Response(JSON.stringify({ error: 'At least one shoe item is required to generate an outfit.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no dress, require top and bottom
    if (!hasDress) {
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
            content: `You are a world-class fashion stylist AI. You create stunning, cohesive outfits based on:
- **Color theory**: complementary, analogous, or monochromatic palettes. Avoid clashing colors.
- **Fabric compatibility**: pair textures thoughtfully (e.g., silk with wool, denim with cotton, not denim with denim).
- **Occasion appropriateness**: formal events need polished pieces, casual outings allow relaxed fabrics and fits. For formal/business/black-tie occasions, NEVER select hats, caps, beanies, or overly casual accessories — stick to watches, belts, scarves, and refined jewelry only.
- **Style cohesion**: items should share a visual language (e.g., don't mix streetwear sneakers with a formal blazer).
- **Layering & proportion**: balance oversized with fitted, structured with flowing.
- **Personal factors**: Consider the user's skin tone for flattering colors, body type for proportions, and personal style preference.
- **User notes**: Pay attention to any notes the user has added about their clothes (comfort, fit, preferences) and factor them into your selection.

Always pick items that genuinely look great together. Explain your reasoning with fashion expertise.`,
          },
          {
            role: 'user',
            content: `Create the best possible outfit for the occasion: \"${occasion}\"
${weather ? `
Current weather: ${weather.temp}°C, ${weather.description}. Factor this into your outfit choices — suggest weather-appropriate layers, fabrics, and styles.
` : ''}
${userProfile ? `
User profile:
- Skin tone: ${userProfile.skinTone || 'not specified'}
- Style preference: ${userProfile.stylePreference || 'not specified'} (IMPORTANT: match this style closely!)
- Body type: ${userProfile.bodyType || 'not specified'}
- Preferred color palettes: ${(userProfile.preferredColors || []).join(', ') || 'not specified'}
- Fashion goal: ${userProfile.fashionGoals || 'not specified'}
` : ''}
Available wardrobe items:
${wardrobeSummary}

Select 2-5 items that create a cohesive, stylish outfit. Use their index numbers (1-based). Consider the user's personal profile for color flattery and style alignment. Explain why these pieces work together.

MANDATORY: Every outfit MUST include exactly one pair of shoes. If a dress is selected, it can substitute for both a top and a bottom — no separate top or bottom is required. Otherwise, include at least one top/jumper and at least one bottom. Never generate an outfit without shoes.`,
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
