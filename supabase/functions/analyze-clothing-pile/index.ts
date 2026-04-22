import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64Size = imageBase64.length * 0.75;
    if (base64Size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    console.log('[analyze-clothing-pile] Calling AI gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a fashion expert AI that analyses photos containing MULTIPLE clothing items, accessories, shoes, hats etc. (e.g. a pile of clothes, an open closet, a flat-lay of items). Identify EVERY distinct wearable item visible. Return a structured list. For each item provide: a descriptive name, category, primary colour, fabric/material, style tags, and an estimated retail value in NZD. Be thorough — if you see 12 items, list 12 items. Avoid duplicates of the same physical item, but DO include similar but distinct items (e.g. two different t-shirts of the same colour are two separate items). Also provide a short location_hint describing where in the image the item is (e.g. "top-left, folded white tee on top of pile") so we can later isolate it.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse this image and list every distinct clothing item, accessory, shoe, or hat you can see. Return at least 1 and up to 30 items.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'list_clothing_items',
              description: 'List every distinct clothing item visible in the photo with full classification details.',
              parameters: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    description: 'Array of all distinct wearable items detected.',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Descriptive name like "Navy Linen Blazer" or "Black Leather Boots"' },
                        category: { type: 'string', enum: ['hats', 'tops', 'bottoms', 'dresses', 'jumpers', 'outerwear', 'shoes', 'accessories'] },
                        color: { type: 'string', description: 'Primary colour of the item' },
                        fabric: { type: 'string', enum: ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Leather', 'Cashmere', 'Suede', 'Knit', 'Chiffon', 'Velvet', 'Nylon', 'Canvas', 'Metal', 'Silver', 'Gold', 'Stainless Steel', 'Titanium', 'Platinum', 'Rubber', 'Satin', 'Faux Leather', 'Gore-Tex', 'Mesh'] },
                        style_tags: { type: 'array', items: { type: 'string' } },
                        estimated_price_nzd: { type: 'number' },
                        location_hint: { type: 'string', description: 'Where in the image the item is located (used to extract it later).' },
                      },
                      required: ['name', 'category', 'color', 'fabric', 'style_tags', 'estimated_price_nzd', 'location_hint'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['items'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'list_clothing_items' } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[analyze-clothing-pile] AI gateway error:', response.status, text);
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[analyze-clothing-pile] No tool call:', JSON.stringify(aiData).substring(0, 500));
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`[analyze-clothing-pile] Detected ${result.items?.length || 0} items`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-clothing-pile] error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
