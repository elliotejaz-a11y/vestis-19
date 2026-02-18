import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Color helpers ───────────────────────────────────────────────

function pixelRGB(px: number): [number, number, number] {
  return [(px >>> 24) & 0xFF, (px >>> 16) & 0xFF, (px >>> 8) & 0xFF];
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  // Weighted Euclidean – green-sensitive (matches human perception better)
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── Core algorithm ──────────────────────────────────────────────

async function removeBackgroundAlgorithmic(imageBytes: Uint8Array): Promise<Uint8Array> {
  let img = await Image.decode(imageBytes);

  // 1. Resize if longest side > 1600px (saves memory + time)
  const MAX = 1600;
  if (img.width > MAX || img.height > MAX) {
    const scale = MAX / Math.max(img.width, img.height);
    img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
  }

  const w = img.width;
  const h = img.height;
  const total = w * h;

  console.log(`Processing ${w}×${h} image (${total} px)`);

  // 2. Sample edge pixels to determine background color
  const step = Math.max(1, Math.floor(Math.min(w, h) / 80));
  const samplesR: number[] = [], samplesG: number[] = [], samplesB: number[] = [];

  const samplePixel = (x: number, y: number) => {
    const px = img.getPixelAt(x, y);
    const [r, g, b] = pixelRGB(px);
    samplesR.push(r); samplesG.push(g); samplesB.push(b);
  };

  // Top & bottom edges
  for (let x = 1; x <= w; x += step) {
    samplePixel(x, 1);
    samplePixel(x, h);
  }
  // Left & right edges
  for (let y = 2; y < h; y += step) {
    samplePixel(1, y);
    samplePixel(w, y);
  }
  // 4 corners – 5×5 block each for robustness
  const cornerSize = Math.min(5, Math.min(w, h));
  for (let dy = 0; dy < cornerSize; dy++) {
    for (let dx = 0; dx < cornerSize; dx++) {
      samplePixel(1 + dx, 1 + dy);
      samplePixel(w - dx, 1 + dy);
      samplePixel(1 + dx, h - dy);
      samplePixel(w - dx, h - dy);
    }
  }

  const bgR = Math.round(median(samplesR));
  const bgG = Math.round(median(samplesG));
  const bgB = Math.round(median(samplesB));

  // 3. Adaptive threshold from edge color variance
  const dists: number[] = [];
  for (let i = 0; i < samplesR.length; i++) {
    dists.push(colorDist(samplesR[i], samplesG[i], samplesB[i], bgR, bgG, bgB));
  }
  const medDist = median(dists);
  // Tighter for uniform backgrounds, looser for noisy ones
  const threshold = Math.max(40, Math.min(100, medDist * 1.8 + 30));

  console.log(`Background: rgb(${bgR},${bgG},${bgB})  threshold: ${threshold.toFixed(1)}`);

  // 4. Flood-fill BFS from all border pixels
  // 0 = unvisited, 1 = background, 2 = foreground (visited but not bg)
  const mask = new Uint8Array(total);
  const queue: number[] = []; // stores flat indices (0-indexed: y*w+x)
  let qIdx = 0;

  const tryEnqueue = (x0: number, y0: number) => {
    if (x0 < 0 || x0 >= w || y0 < 0 || y0 >= h) return;
    const idx = y0 * w + x0;
    if (mask[idx] !== 0) return;
    const px = img.getPixelAt(x0 + 1, y0 + 1); // imagescript is 1-indexed
    const [r, g, b] = pixelRGB(px);
    if (colorDist(r, g, b, bgR, bgG, bgB) <= threshold) {
      mask[idx] = 1;
      queue.push(idx);
    } else {
      mask[idx] = 2; // foreground – won't revisit
    }
  };

  // Seed border pixels
  for (let x = 0; x < w; x++) { tryEnqueue(x, 0); tryEnqueue(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { tryEnqueue(0, y); tryEnqueue(w - 1, y); }

  // BFS
  while (qIdx < queue.length) {
    const idx = queue[qIdx++];
    const x0 = idx % w;
    const y0 = (idx - x0) / w;
    tryEnqueue(x0 - 1, y0);
    tryEnqueue(x0 + 1, y0);
    tryEnqueue(x0, y0 - 1);
    tryEnqueue(x0, y0 + 1);
    // Also check diagonals for better coverage
    tryEnqueue(x0 - 1, y0 - 1);
    tryEnqueue(x0 + 1, y0 - 1);
    tryEnqueue(x0 - 1, y0 + 1);
    tryEnqueue(x0 + 1, y0 + 1);
  }

  const bgCount = qIdx;
  const bgPercent = (bgCount / total * 100).toFixed(1);
  console.log(`Flood fill: ${bgCount} bg pixels (${bgPercent}%)`);

  // Sanity check: if >97% is background, algo likely failed
  if (bgCount / total > 0.97) {
    console.warn('Almost everything detected as background – returning original as PNG');
    return await img.encode();
  }
  // If <3% background, might be a full-frame shot – still return processed
  if (bgCount / total < 0.03) {
    console.warn('Very little background detected – image may already be cropped');
  }

  // 5. Edge feathering: compute distance-to-background for foreground pixels near the edge
  //    Use a 3-level feather (1px=40% alpha, 2px=70% alpha, 3px=90% alpha)
  const edgeDist = new Uint8Array(total); // 0 = bg or deep fg, 1-3 = distance to bg edge

  // Pass 1: foreground pixels adjacent to background → distance 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1) { // foreground
        let touchesBg = false;
        if (x > 0 && mask[idx - 1] === 1) touchesBg = true;
        else if (x < w - 1 && mask[idx + 1] === 1) touchesBg = true;
        else if (y > 0 && mask[idx - w] === 1) touchesBg = true;
        else if (y < h - 1 && mask[idx + w] === 1) touchesBg = true;
        if (touchesBg) edgeDist[idx] = 1;
      }
    }
  }

  // Pass 2: foreground pixels adjacent to dist-1 → distance 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1 && edgeDist[idx] === 0) {
        let touchesEdge1 = false;
        if (x > 0 && edgeDist[idx - 1] === 1) touchesEdge1 = true;
        else if (x < w - 1 && edgeDist[idx + 1] === 1) touchesEdge1 = true;
        else if (y > 0 && edgeDist[idx - w] === 1) touchesEdge1 = true;
        else if (y < h - 1 && edgeDist[idx + w] === 1) touchesEdge1 = true;
        if (touchesEdge1) edgeDist[idx] = 2;
      }
    }
  }

  // Pass 3: distance 3
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1 && edgeDist[idx] === 0) {
        let touchesEdge2 = false;
        if (x > 0 && edgeDist[idx - 1] === 2) touchesEdge2 = true;
        else if (x < w - 1 && edgeDist[idx + 1] === 2) touchesEdge2 = true;
        else if (y > 0 && edgeDist[idx - w] === 2) touchesEdge2 = true;
        else if (y < h - 1 && edgeDist[idx + w] === 2) touchesEdge2 = true;
        if (touchesEdge2) edgeDist[idx] = 3;
      }
    }
  }

  // 6. Apply mask + feathering
  const alphaMap: Record<number, number> = { 1: 0x66, 2: 0xB3, 3: 0xE6 }; // 40%, 70%, 90%

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const ix = x + 1, iy = y + 1; // 1-indexed for imagescript

      if (mask[idx] === 1) {
        // Background → fully transparent
        img.setPixelAt(ix, iy, 0x00000000);
      } else if (edgeDist[idx] > 0) {
        // Edge feathering → partial alpha
        const px = img.getPixelAt(ix, iy);
        const alpha = alphaMap[edgeDist[idx]] || 0xFF;
        img.setPixelAt(ix, iy, ((px >>> 0) & 0xFFFFFF00) | alpha);
      }
      // else: deep foreground → keep fully opaque (no change needed)
    }
  }

  console.log('Background removal complete');
  return await img.encode();
}

// ─── Edge Function handler ───────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── Auth ──
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

    // ── Legacy mode: process base64 directly ──
    if (body.imageBase64) {
      return await handleLegacyMode(body.imageBase64, corsHeaders);
    }

    // ── New mode: wardrobe_item_id ──
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

    try {
      // Download original
      const { data: fileData, error: dlErr } = await serviceClient.storage
        .from('wardrobe-originals')
        .download(item.original_path);

      if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message}`);

      const arrayBuf = await fileData.arrayBuffer();
      const imageBytes = new Uint8Array(arrayBuf);

      // Remove background
      const pngBytes = await removeBackgroundAlgorithmic(imageBytes);

      // Upload cutout
      const cutoutPath = `${userId}/${wardrobe_item_id}.png`;
      const { error: uploadErr } = await serviceClient.storage
        .from('wardrobe-cutouts')
        .upload(cutoutPath, new Blob([pngBytes], { type: 'image/png' }), {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      // Update DB
      await serviceClient.from('wardrobe_items')
        .update({ status: 'completed', cutout_path: cutoutPath })
        .eq('id', wardrobe_item_id);

      const { data: signedData } = await serviceClient.storage
        .from('wardrobe-cutouts')
        .createSignedUrl(cutoutPath, 3600);

      return new Response(JSON.stringify({
        ok: true,
        cutout_path: cutoutPath,
        signed_url: signedData?.signedUrl || null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (processErr) {
      const msg = processErr instanceof Error ? processErr.message : 'Unknown processing error';
      console.error('Processing error:', msg);
      await serviceClient.from('wardrobe_items')
        .update({ status: 'failed', error_message: msg })
        .eq('id', wardrobe_item_id);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
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

// ─── Legacy base64 handler (for AddClothingSheet) ────────────────

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
    // Decode base64 → bytes
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // Process
    const pngBytes = await removeBackgroundAlgorithmic(bytes);

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
    // Fallback: return original
    return new Response(JSON.stringify({ imageBase64: cleanBase64, fallback: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
