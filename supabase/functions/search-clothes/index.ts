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

    // Use Images search with flatlay terms — Shopping returns model/editorial photos
    // which look wrong after background removal. Image search with "flat lay" bias
    // specifically surfaces product-only shots suitable for wardrobe use.
    const flatLayQuery = `${query.trim()} flat lay product photo clothing`;

    // Run both images and shopping in parallel: images for clean visuals,
    // shopping for price/source metadata to enrich results.
    const [imagesRes, shoppingRes] = await Promise.all([
      fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: flatLayQuery, num: 12 }),
      }),
      fetch('https://google.serper.dev/shopping', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query.trim(), num: 10 }),
      }),
    ]);

    if (!imagesRes.ok && !shoppingRes.ok) {
      console.error(`[search-clothes] Both Serper endpoints failed: images=${imagesRes.status} shopping=${shoppingRes.status}`);
      return new Response(JSON.stringify({ results: [], error: 'Search unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build a price lookup from shopping results keyed by source domain
    const priceByDomain: Record<string, { price: string; priceNumeric: number }> = {};
    if (shoppingRes.ok) {
      const shoppingData = await shoppingRes.json();
      const shoppingItems: any[] = shoppingData.shopping || shoppingData.shopping_results || [];
      for (const r of shoppingItems) {
        try {
          const domain = new URL(r.link || '').hostname.replace(/^www\./, '');
          if (domain && r.price && !priceByDomain[domain]) {
            const priceNumeric = parseFloat((r.price || '').replace(/[^0-9.]/g, '')) || 0;
            priceByDomain[domain] = { price: r.price, priceNumeric };
          }
        } catch { /* invalid URL — skip */ }
      }
    }

    // Parse image results
    const imageData = imagesRes.ok ? await imagesRes.json() : { images: [] };
    const imageItems: any[] = imageData.images || [];

    const results = imageItems
      .filter((r: any) => !!(r.imageUrl || r.thumbnailUrl))
      .map((r: any) => {
        const title: string = r.title || query.trim();
        const imageUrl: string = r.imageUrl || r.thumbnailUrl || '';
        let price = '';
        let priceNumeric = 0;
        // Enrich with shopping price if we have one for the same domain
        try {
          const domain = new URL(r.link || '').hostname.replace(/^www\./, '');
          if (domain && priceByDomain[domain]) {
            price = priceByDomain[domain].price;
            priceNumeric = priceByDomain[domain].priceNumeric;
          }
        } catch { /* skip */ }

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
