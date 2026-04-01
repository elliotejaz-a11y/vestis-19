import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    // Use Google Custom Search via a simple fetch to get images
    // We'll use a proxy approach with DuckDuckGo instant answers API
    const searchQuery = encodeURIComponent(`${query} clothing product photo`);
    
    // Use the Lovable AI to generate search-relevant image URLs
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a clothing image search assistant. Given a clothing item search query, return exactly 6 real, publicly accessible product image URLs from major retailers (like Unsplash, Pexels, or stock photo sites). Return ONLY a JSON array of objects with 'url' and 'title' fields. No markdown, no explanation."
            },
            {
              role: "user",
              content: `Find product images for: ${query}`
            }
          ],
          temperature: 0.3,
        }),
      });
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "[]";
        // Try to parse as JSON
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const images = JSON.parse(cleaned);
          return new Response(JSON.stringify({ images: images.slice(0, 6) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          // fallback
        }
      }
    }

    // Fallback: return placeholder suggestions
    const placeholders = [
      { url: `https://source.unsplash.com/400x400/?${searchQuery}`, title: query },
      { url: `https://source.unsplash.com/401x401/?${searchQuery}`, title: `${query} style 2` },
      { url: `https://source.unsplash.com/402x402/?${searchQuery}`, title: `${query} style 3` },
    ];

    return new Response(JSON.stringify({ images: placeholders }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
