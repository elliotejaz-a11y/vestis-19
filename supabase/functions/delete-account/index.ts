import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from public tables (cascade should handle most, but be explicit)
    const tables = [
      "clothing_items", "outfits", "fit_pics", "social_posts", "social_comments",
      "social_likes", "social_stories", "messages", "notifications", "follows",
      "follow_requests", "blocked_users", "feedback", "feedback_votes",
      "planned_outfits", "wardrobe_items", "wardrobe_service_requests", "reports",
    ];

    for (const table of tables) {
      await adminClient.from(table).delete().eq("user_id", user.id);
    }
    // Also delete where user is referenced as other columns
    await adminClient.from("follows").delete().eq("following_id", user.id);
    await adminClient.from("blocked_users").delete().eq("blocked_id", user.id);
    await adminClient.from("messages").delete().eq("receiver_id", user.id);
    await adminClient.from("reports").delete().eq("reported_user_id", user.id);
    await adminClient.from("notifications").delete().eq("from_user_id", user.id);

    // Delete profile
    await adminClient.from("profiles").delete().eq("id", user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
