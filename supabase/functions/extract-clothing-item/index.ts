import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Given the original pile photo plus a textual description of one specific item,
 * uses Gemini image generation (Nano Banana) to render a clean, isolated, studio-style
 * product image of that item on a plain white background, suitable for the wardrobe.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, itemName, visualDescription, category, color, fabric } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!itemName || !visualDescription) {
      return new Response(JSON.stringify({ error: 'itemName and visualDescription are required' }), {
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

    const prompt = `From the reference photo of a pile of clothing, isolate ONLY the following single item and render it as a clean studio product photo on a pure white background:

ITEM: ${itemName}
CATEGORY: ${category || 'unknown'}
COLOR: ${color || 'as visible'}
FABRIC: ${fabric || 'as visible'}
DETAILS: ${visualDescription}

Strict rules:
- Plain pure white background, no shadows, no props, no other clothing.
- Show ONLY this exact single item, fully visible, centred, flat-lay style.
- Match the real item's colour, texture, hardware, prints, logos and proportions exactly as seen.
- Do NOT invent details that aren't visible. Reproduce the same item, not a similar one.
- Photographic quality, e-commerce style, sharp focus.`;

    console.log('[extract-clothing-item] Generating cutout for:', itemName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[extract-clothing-item] AI gateway error:', response.status, text);
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
    const generatedUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedUrl) {
      console.error('[extract-clothing-item] No image returned:', JSON.stringify(aiData).substring(0, 500));
      throw new Error('No image returned by AI');
    }

    return new Response(JSON.stringify({ imageUrl: generatedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[extract-clothing-item] error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
