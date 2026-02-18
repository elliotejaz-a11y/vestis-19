import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXCLUDED_DOMAINS = [
  'shutterstock', 'istockphoto', 'gettyimages', 'adobe.com/stock',
  'freepik', 'depositphotos', 'dreamstime', 'alamy',
  'pinterest', 'flickr', 'unsplash', 'pexels',
  'wikipedia', 'youtube', 'facebook', 'instagram', 'twitter',
];

const EXCLUDED_IMAGE_KEYWORDS = [
  'logo', 'icon', 'sprite', 'avatar', 'tracking', 'pixel',
  'badge', 'rating', 'placeholder', 'banner', 'ad-', 'advertisement',
  'thumbnail', 'thumb_', 'tiny', '1x1', 'spacer', 'watermark',
  'texture', 'pattern', 'swatch', 'fabric-sample',
];

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, color } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build a query targeting retail product pages
    const query = `"${name}" ${color || ''} buy online product page`
      .replace(/\s+/g, ' ')
      .trim();
    console.log('Searching for product image:', query);

    // Search for the product on retail sites
    const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit: 10 }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error('Firecrawl search error:', searchRes.status, errText);
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchData = await searchRes.json();
    const allResults = searchData.data || [];

    // Filter out stock photo sites and non-retail domains
    const results = allResults.filter((r: any) => {
      const url = (r.url || '').toLowerCase();
      return !EXCLUDED_DOMAINS.some(d => url.includes(d));
    });

    console.log(`Found ${results.length} retail results (from ${allResults.length} total)`);

    if (results.length === 0) {
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scrape top results to find a product image (prefer og:image from product pages)
    for (const result of results.slice(0, 3)) {
      try {
        console.log('Scraping:', result.url);
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: result.url,
            formats: ['html'],
            onlyMainContent: false,
          }),
        });

        if (!scrapeRes.ok) {
          await scrapeRes.text();
          continue;
        }

        const scrapeData = await scrapeRes.json();
        const html = scrapeData.data?.html || scrapeData.html || '';

        // Try og:image first — product pages almost always have a clean product og:image
        let foundUrl: string | null = null;

        const ogPatterns = [
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
          /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        ];
        for (const pattern of ogPatterns) {
          const match = html.match(pattern);
          if (match?.[1] && match[1].startsWith('http')) {
            const imgUrl = match[1].toLowerCase();
            // Make sure the og:image isn't a generic site logo
            if (!EXCLUDED_IMAGE_KEYWORDS.some(k => imgUrl.includes(k))) {
              foundUrl = match[1];
              console.log('Found og:image:', foundUrl);
              break;
            }
          }
        }

        // Fallback: look for large product images in img tags
        if (!foundUrl) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
          let imgMatch;
          while ((imgMatch = imgRegex.exec(html)) !== null) {
            const url = imgMatch[1];
            const urlLower = url.toLowerCase();
            if (
              url.startsWith('http') &&
              url.length > 40 &&
              !EXCLUDED_IMAGE_KEYWORDS.some(k => urlLower.includes(k)) &&
              !EXCLUDED_DOMAINS.some(d => urlLower.includes(d)) &&
              (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('.png') || urlLower.includes('.webp'))
            ) {
              foundUrl = url;
              console.log('Found img tag image:', foundUrl);
              break;
            }
          }
        }

        if (foundUrl) {
          // Download the image and convert to base64
          try {
            const imgRes = await fetch(foundUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
            });

            if (imgRes.ok) {
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

              // Verify it's actually an image
              if (!contentType.startsWith('image/')) {
                console.log('Not an image content-type:', contentType);
                continue;
              }

              const arrayBuffer = await imgRes.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);

              // Skip tiny images (likely icons/thumbnails) or huge ones
              if (bytes.length < 10000) {
                console.log('Image too small, skipping:', bytes.length);
                continue;
              }
              if (bytes.length > 10 * 1024 * 1024) {
                console.log('Image too large, skipping:', bytes.length);
                continue;
              }

              const base64 = uint8ArrayToBase64(bytes);
              console.log('Product image downloaded, size:', bytes.length, 'type:', contentType);

              return new Response(
                JSON.stringify({ imageBase64: base64, contentType, sourceUrl: foundUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log('Image download failed:', imgRes.status);
            }
          } catch (downloadErr) {
            console.error('Failed to download image:', downloadErr);
            continue;
          }
        }
      } catch (e) {
        console.error('Scrape failed for', result.url, e);
        continue;
      }
    }

    console.log('No suitable product image found');
    return new Response(JSON.stringify({ imageBase64: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search-clothing-image error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        imageBase64: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
