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
    const { occasion, items, userProfile, weather } = await req.json();
    if (!occasion || !items?.length) {
      return new Response(JSON.stringify({ error: 'Occasion and items required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Build a summary of wardrobe items for the AI
    const wardrobeSummary = items.map((item: any, i: number) => 
      `${i + 1}. "${item.name}" — ${item.category}, ${item.color}, ${item.fabric}, tags: [${(item.tags || []).join(', ')}]${item.notes ? `, user notes: "${item.notes}"` : ''}`
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
- **Occasion appropriateness**: formal events need polished pieces, casual outings allow relaxed fabrics and fits.
- **Style cohesion**: items should share a visual language (e.g., don't mix streetwear sneakers with a formal blazer).
- **Layering & proportion**: balance oversized with fitted, structured with flowing.
- **Personal factors**: Consider the user's skin tone for flattering colors, body type for proportions, and personal style preference.
- **User notes**: Pay attention to any notes the user has added about their clothes (comfort, fit, preferences) and factor them into your selection.

Always pick items that genuinely look great together. Explain your reasoning with fashion expertise.`,
          },
          {
            role: 'user',
            content: `Create the best possible outfit for the occasion: "${occasion}"
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

Select 2-5 items that create a cohesive, stylish outfit. Use their index numbers (1-based). Consider the user's personal profile for color flattery and style alignment. Explain why these pieces work together.`,
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call in response');

    const result = JSON.parse(toolCall.function.arguments);

    // Map indices back to actual items
    const selectedItems = result.selected_indices
      .filter((idx: number) => idx >= 1 && idx <= items.length)
      .map((idx: number) => items[idx - 1]);

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
