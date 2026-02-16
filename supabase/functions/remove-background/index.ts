import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

function base64ToBlob(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: 'image/png' });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
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

    const REMOVE_BG_API_KEY = Deno.env.get('REMOVE_BG_API_KEY');
    if (!REMOVE_BG_API_KEY) throw new Error('REMOVE_BG_API_KEY is not configured');

    const imageBlob = base64ToBlob(cleanBase64);
    const formData = new FormData();
    formData.append('image_file', imageBlob, 'image.png');
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('remove.bg API error:', response.status, errorBody);
      return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = uint8ArrayToBase64(new Uint8Array(resultBuffer));

    console.log('Background removed successfully');
    return new Response(JSON.stringify({ imageBase64: resultBase64 }), {
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
