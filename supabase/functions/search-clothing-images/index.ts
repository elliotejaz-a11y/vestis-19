import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    if (!SERPER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SERPER_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bias toward product-only images: exclude people, models, lifestyle
    const searchQuery = `${query.trim()} clothing item product photo flat lay -model -person -wearing -outfit -lifestyle`;

    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 30,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Serper API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Image search failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const PEOPLE_PATTERN = /\b(wearing|worn|model|outfit of the day|ootd|street style|person|man wearing|woman wearing|guy in|girl in)\b/i;
    const images = (data.images || [])
      .filter((img: any) => {
        if (!img.imageUrl || typeof img.imageUrl !== "string") return false;
        const title = (img.title || "").toLowerCase();
        // Filter out results that are clearly people/lifestyle shots
        if (PEOPLE_PATTERN.test(title)) return false;
        return true;
      })
      .map((img: any) => ({
        url: img.imageUrl,
        thumbnail: img.thumbnailUrl || img.imageUrl,
        title: img.title || "",
        source: img.source || "",
      }));

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search-clothing-images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
