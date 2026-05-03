import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
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
                  category: { type: 'string', enum: ['hats', 'tops', 'bottoms', 'dresses', 'jumpers', 'outerwear', 'shoes', 'accessories'], description: 'Clothing category. Use "hats" for caps, beanies, bucket hats, fedoras, and all headwear. Use "jumpers" for sweaters, jumpers, knit pullovers, cardigans, and similar knitwear. Use "accessories" for bags, belts, watches, jewellery, scarves, sunglasses, etc.' },
                  color: { type: 'string', description: 'Primary color of the item' },
                  fabric: { type: 'string', enum: ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Leather', 'Cashmere', 'Suede', 'Knit', 'Chiffon', 'Velvet', 'Nylon', 'Canvas', 'Metal', 'Silver', 'Gold', 'Stainless Steel', 'Titanium', 'Platinum', 'Rubber', 'Satin', 'Faux Leather', 'Gore-Tex', 'Mesh'], description: 'Primary fabric/material.' },
                  style_tags: { type: 'array', items: { type: 'string' }, description: 'Style descriptors like casual, formal, streetwear, vintage, bohemian, preppy, sporty, elegant' },
                  estimated_price_nzd: { type: 'number', description: 'Estimated retail value in New Zealand Dollars (NZD).' },
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
      const text = await response.text();
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
    if (!toolCall) throw new Error('No tool call in response');

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
