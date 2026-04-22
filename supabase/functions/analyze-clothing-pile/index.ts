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

    console.log('[analyze-clothing-pile] Calling AI gateway to detect items...');

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
            content: `You are a fashion expert AI that identifies INDIVIDUAL clothing items, shoes and accessories from a photo of a pile, closet, drawer, or group of items. Return EVERY distinct item you can clearly see — even if partially visible — with specific descriptions, attributes, and value estimates in NZD. Be thorough but never invent items that are not visible.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify every distinct clothing item, shoe and accessory in this photo. For each item return its descriptive name, category, primary color, fabric, style tags, an estimated retail price in NZD, AND a short visual_description (1 sentence) detailing exactly what it looks like (style, color, distinguishing details, any text/logos visible) so a designer could recreate it. Skip items that are too obscured to identify confidently.',
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
              name: 'classify_clothing_pile',
              description: 'Classify every clothing item visible in a pile/closet photo',
              parameters: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    description: 'Array of every distinct clothing item identified in the photo',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Descriptive name like "Navy Linen Blazer" or "Black Leather Boots"' },
                        category: { type: 'string', enum: ['hats', 'tops', 'bottoms', 'dresses', 'jumpers', 'outerwear', 'shoes', 'accessories'], description: 'Clothing category. Use "hats" for caps/beanies, "jumpers" for sweaters/cardigans, "accessories" for bags/belts/watches/jewellery/scarves/sunglasses.' },
                        color: { type: 'string', description: 'Primary color of the item' },
                        fabric: { type: 'string', enum: ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Leather', 'Cashmere', 'Suede', 'Knit', 'Chiffon', 'Velvet', 'Nylon', 'Canvas', 'Metal', 'Silver', 'Gold', 'Stainless Steel', 'Titanium', 'Platinum', 'Rubber', 'Satin', 'Faux Leather', 'Gore-Tex', 'Mesh'], description: 'Primary fabric/material.' },
                        style_tags: { type: 'array', items: { type: 'string' }, description: 'Style descriptors like casual, formal, streetwear, vintage' },
                        estimated_price_nzd: { type: 'number', description: 'Estimated retail value in NZD.' },
                        visual_description: { type: 'string', description: 'One-sentence visual description: style, color, distinguishing details (logos, prints, hardware, length, fit) so an artist could recreate the exact item.' },
                      },
                      required: ['name', 'category', 'color', 'fabric', 'style_tags', 'estimated_price_nzd', 'visual_description'],
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
        tool_choice: { type: 'function', function: { name: 'classify_clothing_pile' } },
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
    console.log(`[analyze-clothing-pile] Detected ${result.items?.length ?? 0} items`);

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
