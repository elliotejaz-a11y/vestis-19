import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Verify the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from all tables (order matters for foreign keys)
    const tables = [
      { table: "social_comments", column: "user_id" },
      { table: "social_likes", column: "user_id" },
      { table: "social_posts", column: "user_id" },
      { table: "social_stories", column: "user_id" },
      { table: "outfit_items", column: "outfit_id", subquery: true },
      { table: "planned_outfits", column: "user_id" },
      { table: "fit_pics", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "messages", column: "sender_id" },
      { table: "messages", column: "receiver_id" },
      { table: "follow_requests", column: "requester_id" },
      { table: "follow_requests", column: "target_id" },
      { table: "follows", column: "follower_id" },
      { table: "follows", column: "following_id" },
      { table: "blocked_users", column: "blocker_id" },
      { table: "blocked_users", column: "blocked_id" },
      { table: "feedback_votes", column: "user_id" },
      { table: "feedback", column: "user_id" },
      { table: "reports", column: "reporter_id" },
      { table: "wardrobe_items", column: "user_id" },
      { table: "wardrobe_service_requests", column: "user_id" },
      { table: "clothing_items", column: "user_id" },
      { table: "outfits", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    // Delete outfit_items via outfit ids first
    const { data: outfitIds } = await supabaseAdmin
      .from("outfits")
      .select("id")
      .eq("user_id", userId);
    
    if (outfitIds && outfitIds.length > 0) {
      const ids = outfitIds.map((o: any) => o.id);
      await supabaseAdmin.from("outfit_items").delete().in("outfit_id", ids);
    }

    for (const { table, column, subquery } of tables) {
      if (subquery) continue; // already handled outfit_items above
      await supabaseAdmin.from(table).delete().eq(column, userId);
    }

    // Delete storage files
    for (const bucket of ["clothing-images", "social-media", "wardrobe-originals", "wardrobe-cutouts"]) {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from(bucket).remove(paths);
      }
    }

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
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
