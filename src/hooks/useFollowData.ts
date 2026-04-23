import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFollowData() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: following }, { data: followers }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
    ]);
    setFollowingIds((following || []).map((f: any) => f.following_id));
    setFollowerIds((followers || []).map((f: any) => f.follower_id));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { followingIds, followerIds, loading, refresh };
}
