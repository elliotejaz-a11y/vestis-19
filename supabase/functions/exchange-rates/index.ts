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
    // Fetch live rates from frankfurter.app (free, no API key needed, ECB data)
    const response = await fetch('https://api.frankfurter.app/latest?from=NZD&to=USD,EUR');
    
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
    
    const rates: Record<string, number> = {
      NZD: 1,
      USD: data.rates.USD,
      EUR: data.rates.EUR,
    };

    return new Response(JSON.stringify({ rates, date: data.date }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    // Fallback rates if API fails
    return new Response(JSON.stringify({ 
      rates: { NZD: 1, USD: 0.56, EUR: 0.52 }, 
      date: null, 
      fallback: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
