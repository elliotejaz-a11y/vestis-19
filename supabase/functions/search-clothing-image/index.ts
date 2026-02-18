import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const query = `${name} ${color || ''} ${category || ''} clothing product photo white background`
      .replace(/\s+/g, ' ')
      .trim();
    console.log('Searching for product image:', query);

    // Step 1: Search for the product
    const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit: 5 }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error('Firecrawl search error:', searchRes.status, errText);
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchData = await searchRes.json();
    const results = searchData.data || [];
    console.log(`Found ${results.length} search results`);

    if (results.length === 0) {
      return new Response(JSON.stringify({ imageBase64: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Scrape top results to find a product image
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

        // Try og:image first (most reliable for product pages)
        let foundUrl: string | null = null;

        const ogPatterns = [
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
          /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        ];
        for (const pattern of ogPatterns) {
          const match = html.match(pattern);
          if (match?.[1] && match[1].startsWith('http')) {
            foundUrl = match[1];
            break;
          }
        }

        // Fallback: look for product images in img tags
        if (!foundUrl) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
          let imgMatch;
          while ((imgMatch = imgRegex.exec(html)) !== null) {
            const url = imgMatch[1];
            if (
              url.startsWith('http') &&
              url.length > 40 &&
              !url.includes('logo') &&
              !url.includes('icon') &&
              !url.includes('sprite') &&
              !url.includes('avatar') &&
              !url.includes('tracking') &&
              !url.includes('pixel') &&
              !url.includes('badge') &&
              !url.includes('rating') &&
              !url.includes('placeholder') &&
              (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || url.includes('/image'))
            ) {
              foundUrl = url;
              break;
            }
          }
        }

        if (foundUrl) {
          console.log('Found image URL:', foundUrl);

          // Download the image and convert to base64
          try {
            const imgRes = await fetch(foundUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });

            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);

              // Skip if image is too small (likely a thumbnail/icon) or too large
              if (bytes.length < 5000) {
                console.log('Image too small, skipping:', bytes.length);
                continue;
              }
              if (bytes.length > 10 * 1024 * 1024) {
                console.log('Image too large, skipping:', bytes.length);
                continue;
              }

              const base64 = uint8ArrayToBase64(bytes);
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

              console.log('Image downloaded successfully, size:', bytes.length, 'type:', contentType);

              return new Response(
                JSON.stringify({
                  imageBase64: base64,
                  contentType,
                  sourceUrl: foundUrl,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
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
