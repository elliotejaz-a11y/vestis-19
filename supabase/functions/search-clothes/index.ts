import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAND_STOP_WORDS = new Set([
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'grey', 'gray',
  'navy', 'beige', 'brown', 'purple', 'orange', 'gold', 'silver', 'cream',
  'new', 'sale', 'best', 'top', 'high', 'low', 'classic', 'slim', 'fit',
  'plus', 'size', 'men', 'women', 'mens', 'womens', 'unisex',
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'on', 'at',
  'vintage', 'retro', 'premium', 'luxury', 'authentic',
]);

function extractBrand(title: string): string {
  const words = title.split(/\s+/);
  const brandWords: string[] = [];

  for (const word of words.slice(0, 3)) {
    const clean = word.replace(/[^a-zA-Z0-9&'\-]/g, '');
    if (!clean) break;
    const lower = clean.toLowerCase().replace(/'s$/, '');
    if (BRAND_STOP_WORDS.has(lower)) break;
    // Must start with uppercase to be a brand name
    if (clean[0] !== clean[0].toUpperCase()) break;
    brandWords.push(clean);
    if (brandWords.length >= 2) break;
  }

  return brandWords.join(' ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('SERPER_API_KEY');
    if (!apiKey) {
      console.error('[search-clothes] SERPER_API_KEY not configured');
      return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serperRes = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query.trim(), num: 10 }),
    });

    if (!serperRes.ok) {
      console.error(`[search-clothes] Serper responded ${serperRes.status}`);
      return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serperData = await serperRes.json();
    const shoppingResults: any[] = serperData.shopping_results || [];

    const results = shoppingResults
      .map((r: any) => {
        const title: string = r.title || '';
        const imageUrl: string =
          r.imageUrl || r.thumbnailUrl || r.imageLink || r.thumbnail || '';
        const price: string = r.price || '';
        const priceNumeric = price ? parseFloat(price.replace(/[^0-9.]/g, '')) || 0 : 0;

        return {
          title,
          brand: extractBrand(title),
          price,
          priceNumeric,
          imageUrl,
          productLink: r.link || '',
          source: r.source || '',
        };
      })
      .filter((r: any) => !!r.imageUrl);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[search-clothes] Unexpected error:', err);
    return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
