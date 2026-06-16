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

    const apiKey = Deno.env.get('TALORDATA_API_KEY');
    if (!apiKey) {
      console.error('[search-clothes] TALORDATA_API_KEY not configured');
      return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query.trim(),
      json: '1',
      num: '10',
      direct_link: '1',
    });

    const talorRes = await fetch('https://serpapi.talordata.net/serp/v1/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!talorRes.ok) {
      console.error(`[search-clothes] TalorData responded ${talorRes.status}`);
      return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const talorData = await talorRes.json();
    const shoppingResults: any[] = talorData?.data?.shopping || [];

    const results = shoppingResults
      .map((r: any) => {
        const title: string = r.title || '';
        const imageUrl: string = r.img_link || '';
        const price: string = r.price || '';
        const priceNumeric = price ? parseFloat(price.replace(/[^0-9.]/g, '')) || 0 : 0;

        return {
          title,
          brand: extractBrand(title),
          price,
          priceNumeric,
          imageUrl,
          productLink: r.product_link || '',
          source: r.source || '',
        };
      })
      .filter((r: any) => !!r.imageUrl)
      .slice(0, 10);

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
