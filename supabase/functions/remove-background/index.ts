import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service role client for storage operations
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth: validate user
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

    // Support two modes: legacy (imageBase64) and new (wardrobe_item_id)
    if (body.imageBase64) {
      // Legacy mode: process base64 directly and return result
      return await handleLegacyMode(body.imageBase64, LOVABLE_API_KEY, corsHeaders);
    }

    const { wardrobe_item_id } = body;
    if (!wardrobe_item_id) {
      return new Response(JSON.stringify({ ok: false, error: 'wardrobe_item_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the wardrobe item and verify ownership
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

    // Update status to processing
    await serviceClient
      .from('wardrobe_items')
      .update({ status: 'processing' })
      .eq('id', wardrobe_item_id);

    try {
      // Download original image from storage
      const { data: fileData, error: dlErr } = await serviceClient.storage
        .from('wardrobe-originals')
        .download(item.original_path);

      if (dlErr || !fileData) {
        throw new Error(`Failed to download original: ${dlErr?.message || 'unknown'}`);
      }

      // Convert to base64 for Gemini
      const arrayBuf = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const imageBase64 = btoa(binary);

      // Call Gemini for background removal
      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Remove the background from this image completely, leaving ONLY the clothing item/accessory with a fully transparent background. Do not add any background color — the result must have alpha transparency. Keep the subject exactly as it is with no changes to colors, details, or proportions. Output the result as a PNG image with transparent background.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/png;base64,${imageBase64}` },
                },
              ],
            },
          ],
        }),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error('Gemini error:', geminiResponse.status, errText);
        if (geminiResponse.status === 429) throw new Error('Rate limited — please try again later');
        if (geminiResponse.status === 402) throw new Error('AI credits exhausted');
        throw new Error(`AI provider error: ${geminiResponse.status}`);
      }

      const result = await geminiResponse.json();
      const content = result?.choices?.[0]?.message?.content;

      let outputBase64: string | null = null;

      // Extract image from response
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            let b64 = part.image_url.url;
            if (b64.startsWith('data:')) b64 = b64.split(',')[1] || b64;
            outputBase64 = b64;
            break;
          }
          if (part.inline_data?.data) {
            outputBase64 = part.inline_data.data;
            break;
          }
        }
      }
      if (!outputBase64 && typeof content === 'string') {
        const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
        if (match?.[1]) outputBase64 = match[1];
      }

      if (!outputBase64) {
        throw new Error('Could not extract processed image from AI response');
      }

      // Decode base64 to binary
      const binaryStr = atob(outputBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const pngBlob = new Blob([bytes], { type: 'image/png' });

      // Upload cutout to wardrobe-cutouts
      const cutoutPath = `${userId}/${wardrobe_item_id}.png`;
      const { error: uploadErr } = await serviceClient.storage
        .from('wardrobe-cutouts')
        .upload(cutoutPath, pngBlob, { contentType: 'image/png', upsert: true });

      if (uploadErr) throw new Error(`Cutout upload failed: ${uploadErr.message}`);

      // Update DB to completed
      await serviceClient
        .from('wardrobe_items')
        .update({ status: 'completed', cutout_path: cutoutPath })
        .eq('id', wardrobe_item_id);

      // Generate signed URL for the cutout
      const { data: signedData } = await serviceClient.storage
        .from('wardrobe-cutouts')
        .createSignedUrl(cutoutPath, 3600);

      return new Response(JSON.stringify({
        ok: true,
        cutout_path: cutoutPath,
        signed_url: signedData?.signedUrl || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (processErr) {
      const errorMsg = processErr instanceof Error ? processErr.message : 'Unknown processing error';
      console.error('Processing error:', errorMsg);

      await serviceClient
        .from('wardrobe_items')
        .update({ status: 'failed', error_message: errorMsg })
        .eq('id', wardrobe_item_id);

      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('remove-background error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Legacy mode handler for backward compatibility with AddClothingSheet
async function handleLegacyMode(imageBase64: string, apiKey: string, corsHeaders: Record<string, string>) {
  let cleanBase64 = imageBase64.trim();
  if (cleanBase64.startsWith('data:')) {
    cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
  }
  cleanBase64 = cleanBase64.replace(/\s/g, '');

  const base64Size = cleanBase64.length * 0.75;
  if (base64Size > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Remove the background from this image completely, leaving ONLY the clothing item/accessory with a fully transparent background. Do not add any background color — the result must have alpha transparency. Keep the subject exactly as it is with no changes to colors, details, or proportions. Output the result as a PNG image with transparent background.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${cleanBase64}` },
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true, error: response.status === 429 ? 'Rate limited' : 'Credits exhausted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          let b64 = part.image_url.url;
          if (b64.startsWith('data:')) b64 = b64.split(',')[1] || b64;
          return new Response(JSON.stringify({ imageBase64: b64 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (part.inline_data?.data) {
          return new Response(JSON.stringify({ imageBase64: part.inline_data.data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    if (typeof content === 'string') {
      const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (match?.[1]) {
        return new Response(JSON.stringify({ imageBase64: match[1] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
