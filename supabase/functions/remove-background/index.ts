import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (authError || !data?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    let cleanBase64 = imageBase64.trim();
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

    // Decode base64 to binary for the multipart form upload
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const imageBlob = new Blob([bytes], { type: 'image/png' });

    // Use OpenAI's gpt-image-1 model via the images/edits endpoint
    const formData = new FormData();
    formData.append('image', imageBlob, 'clothing.png');
    formData.append('prompt', 'Of the clothes added please remove the background and make it that only the clothes which seem to have been intentionally added remain. Output a PNG with a fully transparent background.');
    formData.append('model', 'gpt-image-1');
    formData.append('size', '1024x1024');

    console.log('Calling OpenAI image edit API...');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI image edit error:', response.status, errorBody);

      if (response.status === 429) {
        return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true, error: 'Rate limited' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('OpenAI response received, data length:', result?.data?.length);

    // OpenAI returns data[0].b64_json or data[0].url
    const imageData = result?.data?.[0];
    if (imageData?.b64_json) {
      console.log('Background removed successfully via OpenAI (b64_json)');
      return new Response(JSON.stringify({ imageBase64: imageData.b64_json }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (imageData?.url) {
      // Download the image from URL and convert to base64
      console.log('OpenAI returned URL, downloading...');
      const imgResp = await fetch(imageData.url);
      if (imgResp.ok) {
        const imgBuffer = await imgResp.arrayBuffer();
        const imgBytes = new Uint8Array(imgBuffer);
        let b64 = '';
        const chunkSize = 8192;
        for (let i = 0; i < imgBytes.length; i += chunkSize) {
          b64 += String.fromCharCode(...imgBytes.slice(i, i + chunkSize));
        }
        const outputBase64 = btoa(b64);
        console.log('Background removed successfully via OpenAI (url download)');
        return new Response(JSON.stringify({ imageBase64: outputBase64 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: return original
    console.log('Could not extract processed image from OpenAI response');
    return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('remove-background error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
