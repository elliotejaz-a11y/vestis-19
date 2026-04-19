import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://vestis-19.lovable.app',
  'https://vestisapp.online',
  'https://www.vestisapp.online',
  'https://id-preview--1830068e-1c44-4713-a94f-43ffd21bb2c7.lovable.app',
  'https://1830068e-1c44-4713-a94f-43ffd21bb2c7.lovableproject.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const KLAVIYO_API_KEY = Deno.env.get('KLAVIYO_API_KEY');
    if (!KLAVIYO_API_KEY) {
      return new Response(JSON.stringify({ error: 'KLAVIYO_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, email, properties, eventName, eventProperties } = await req.json();

    // Identify / upsert profile
    if (action === 'identify') {
      const targetEmail = email || userData.user.email;
      if (!targetEmail) {
        return new Response(JSON.stringify({ error: 'Email required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resp = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-10-15',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email: targetEmail,
              properties: properties || {},
            },
          },
        }),
      });

      const result = await resp.json();
      if (!resp.ok && resp.status !== 409) {
        console.error('Klaviyo identify error:', resp.status, result);
        return new Response(JSON.stringify({ error: 'Klaviyo identify failed', details: result }), {
          status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, profile: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Track event
    if (action === 'track') {
      const targetEmail = email || userData.user.email;
      if (!targetEmail || !eventName) {
        return new Response(JSON.stringify({ error: 'Email and eventName required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resp = await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-10-15',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              properties: eventProperties || {},
              metric: { data: { type: 'metric', attributes: { name: eventName } } },
              profile: { data: { type: 'profile', attributes: { email: targetEmail } } },
            },
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error('Klaviyo track error:', resp.status, err);
        return new Response(JSON.stringify({ error: 'Klaviyo track failed', details: err }), {
          status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use "identify" or "track".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('klaviyo-track error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
