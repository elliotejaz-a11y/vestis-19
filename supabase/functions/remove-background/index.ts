import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
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

    // Decode base64 to binary
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build FormData with the image file
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'image/png' });
    formData.append('image', blob, 'image.png');

    const API4AI_API_KEY = Deno.env.get('API4AI_API_KEY');
    if (!API4AI_API_KEY) throw new Error('API4AI_API_KEY is not configured');

    const response = await fetch('https://background-removal4.p.rapidapi.com/v1/results', {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': API4AI_API_KEY,
        'X-RapidAPI-Host': 'background-removal4.p.rapidapi.com',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API4AI error:', response.status, errorBody);
      return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    
    // API4AI returns results in: result.results[0].entities[0].image (base64 string)
    const resultImage = result?.results?.[0]?.entities?.[0]?.image;
    
    if (resultImage && typeof resultImage === 'string') {
      // Remove data URI prefix if present
      let outputBase64 = resultImage;
      if (outputBase64.startsWith('data:')) {
        outputBase64 = outputBase64.split(',')[1] || outputBase64;
      }
      console.log('Background removed successfully via API4AI');
      return new Response(JSON.stringify({ imageBase64: outputBase64 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: return original
    console.log('Could not extract processed image from API4AI, returning original');
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
