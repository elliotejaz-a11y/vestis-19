import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use exchangerate.host (free, no key required)
    const response = await fetch('https://open.er-api.com/v6/latest/NZD');

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error('API returned unsuccessful result');
    }

    const rates: Record<string, number> = {
      NZD: 1,
      USD: data.rates.USD,
      EUR: data.rates.EUR,
    };

    return new Response(JSON.stringify({ rates, date: data.time_last_update_utc }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return new Response(JSON.stringify({ 
      rates: { NZD: 1, USD: 0.56, EUR: 0.52 }, 
      date: null, 
      fallback: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
