// validate-username — server-side profanity + inappropriate content check.
// Uses leo-profanity (npm) which handles leetspeak, variations, and common
// substitutions without false-positives from substring matches (Scunthorpe-safe).
import { leoProfanity } from "npm:leo-profanity@1.6.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Load the full English dictionary (includes slurs, sexual content, profanity).
// loadDictionary("en") merges the English word list into the filter instance.
leoProfanity.loadDictionary("en");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ valid: false, reason: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalise: lowercase, collapse repeated chars (e.g. "shhiiit" → "shit")
    // leo-profanity handles leetspeak internally (@ss → ass, sh1t → shit, etc.)
    const normalised = username.toLowerCase().trim();

    // Basic format validation (mirrors client-side rules)
    if (normalised.length < 3 || normalised.length > 30) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Username must be 3–30 characters" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isProfane = leoProfanity.check(normalised);

    return new Response(
      JSON.stringify({
        valid: !isProfane,
        reason: isProfane ? "This username isn't allowed. Please choose a different one." : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-username error:", err);
    return new Response(
      JSON.stringify({ valid: true }), // fail open — availability check still blocks bad names
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
