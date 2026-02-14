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
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

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
            content: `You are a fashion expert AI that analyzes clothing items from photos. You must return structured data about the clothing item including an estimated retail value in NZD (New Zealand Dollars). Consider the brand quality indicators, fabric type, condition, and style when estimating the price. The "Vestis Price" should reflect what this item would reasonably cost in NZD at retail.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this clothing item. Identify: the type/category, primary color, fabric/material, a descriptive name, and estimate its retail value in NZD. Be specific and accurate.',
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
              name: 'classify_clothing',
              description: 'Classify a clothing item from a photo and estimate its value',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Descriptive name like "Navy Linen Blazer" or "Black Leather Boots"' },
                  category: { type: 'string', enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'], description: 'Clothing category' },
                  color: { type: 'string', enum: ['Black', 'White', 'Navy', 'Beige', 'Brown', 'Red', 'Blue', 'Green', 'Pink', 'Gray', 'Burgundy', 'Olive', 'Cream', 'Tan', 'Charcoal'], description: 'Primary color' },
                  fabric: { type: 'string', enum: ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Leather', 'Cashmere', 'Suede', 'Knit', 'Chiffon', 'Velvet', 'Nylon', 'Canvas'], description: 'Primary fabric/material' },
                  style_tags: { type: 'array', items: { type: 'string' }, description: 'Style descriptors like casual, formal, streetwear, vintage, bohemian, preppy, sporty, elegant' },
                  estimated_price_nzd: { type: 'number', description: 'Estimated retail value in New Zealand Dollars (NZD). Consider fabric quality, style, and typical retail pricing.' },
                },
                required: ['name', 'category', 'color', 'fabric', 'style_tags', 'estimated_price_nzd'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'classify_clothing' } },
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call in response');

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-clothing error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
