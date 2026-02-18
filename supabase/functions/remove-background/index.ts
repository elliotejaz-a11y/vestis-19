import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function removeBackgroundViaAPI(imageBytes: Uint8Array): Promise<Uint8Array> {
  const apiKey = Deno.env.get('REMOVE_BG_API_KEY');
  if (!apiKey) throw new Error('REMOVE_BG_API_KEY not configured');

  const formData = new FormData();
  formData.append('image_file', new Blob([imageBytes]), 'image.jpg');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('remove.bg error:', response.status, errText);
    throw new Error(`remove.bg API error: ${response.status}`);
  }

  const arrayBuf = await response.arrayBuffer();
  return new Uint8Array(arrayBuf);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = authData.user.id;

    const body = await req.json();

    // Legacy base64 mode
    if (body.imageBase64) {
      return await handleLegacyMode(body.imageBase64, corsHeaders);
    }

    // New mode: wardrobe_item_id
    const { wardrobe_item_id } = body;
    if (!wardrobe_item_id) {
      return new Response(JSON.stringify({ ok: false, error: 'wardrobe_item_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch item & verify ownership
    const { data: item, error: fetchErr } = await serviceClient
      .from('wardrobe_items')
      .select('*')
      .eq('id', wardrobe_item_id)
      .single();

    if (fetchErr || !item) {
      return new Response(JSON.stringify({ ok: false, error: 'Item not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (item.user_id !== userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set status → processing
    await serviceClient.from('wardrobe_items').update({ status: 'processing' }).eq('id', wardrobe_item_id);

    // Process in background
    const processInBackground = async () => {
      try {
        const { data: fileData, error: dlErr } = await serviceClient.storage
          .from('wardrobe-originals')
          .download(item.original_path);

        if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message}`);

        const arrayBuf = await fileData.arrayBuffer();
        const imageBytes = new Uint8Array(arrayBuf);

        // Remove background via API
        const pngBytes = await removeBackgroundViaAPI(imageBytes);

        // Upload cutout
        const cutoutPath = `${userId}/${wardrobe_item_id}.png`;
        const { error: uploadErr } = await serviceClient.storage
          .from('wardrobe-cutouts')
          .upload(cutoutPath, new Blob([pngBytes], { type: 'image/png' }), {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

        await serviceClient.from('wardrobe_items')
          .update({ status: 'completed', cutout_path: cutoutPath })
          .eq('id', wardrobe_item_id);

      } catch (processErr) {
        const msg = processErr instanceof Error ? processErr.message : 'Unknown processing error';
        console.error('Processing error:', msg);
        await serviceClient.from('wardrobe_items')
          .update({ status: 'failed', error_message: msg })
          .eq('id', wardrobe_item_id);
      }
    };

    (globalThis as any).EdgeRuntime?.waitUntil?.(processInBackground()) ?? await processInBackground();

    return new Response(JSON.stringify({
      ok: true,
      wardrobe_item_id,
      message: 'Processing started',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('remove-background error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Legacy base64 handler
async function handleLegacyMode(imageBase64: string, cors: Record<string, string>) {
  let cleanBase64 = imageBase64.trim();
  if (cleanBase64.startsWith('data:')) cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
  cleanBase64 = cleanBase64.replace(/\s/g, '');

  if (cleanBase64.length * 0.75 > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const pngBytes = await removeBackgroundViaAPI(bytes);

    // Encode result back to base64
    let resultB64 = '';
    const chunk = 32768;
    for (let i = 0; i < pngBytes.length; i += chunk) {
      resultB64 += String.fromCharCode(...pngBytes.subarray(i, i + chunk));
    }
    resultB64 = btoa(resultB64);

    return new Response(JSON.stringify({ imageBase64: resultB64 }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Legacy bg removal error:', err);
    return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
