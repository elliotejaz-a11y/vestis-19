import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SocialPost {
  id: string;
  user_id: string;
  caption: string;
  image_urls: string[];
  outfit_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null };
  liked_by_me?: boolean;
}

export interface SocialStory {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  expires_at: string;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

export interface SocialComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

export function useSocial() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch following IDs
    const { data: followData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const fIds = (followData || []).map((f: any) => f.following_id);
    setFollowingIds(fIds);

    // Fetch posts (from followed users + own + public)
    const { data: postData } = await supabase
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postData) {
      // Fetch profiles for post authors
      const userIds = [...new Set(postData.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      // Check which posts I liked
      const { data: myLikes } = await supabase
        .from("social_likes")
        .select("post_id")
        .eq("user_id", user.id);
      const likedPostIds = new Set((myLikes || []).map((l: any) => l.post_id));

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      setPosts(postData.map((p: any) => ({
        ...p,
        user: profileMap.get(p.user_id),
        liked_by_me: likedPostIds.has(p.id),
      })));
    }

    // Fetch active stories
    const { data: storyData } = await supabase
      .from("social_stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (storyData) {
      const userIds = [...new Set(storyData.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      setStories(storyData.map((s: any) => ({
        ...s,
        user: profileMap.get(s.user_id),
      })));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const createPost = async (imageUrls: string[], caption: string, outfitId?: string) => {
    if (!user) return;
    const { error } = await supabase.from("social_posts").insert({
      user_id: user.id,
      image_urls: imageUrls,
      caption,
      outfit_id: outfitId || null,
    } as any);
    if (!error) await fetchFeed();
    return error;
  };

  const createStory = async (imageUrl: string, caption: string) => {
    if (!user) return;
    const { error } = await supabase.from("social_stories").insert({
      user_id: user.id,
      image_url: imageUrl,
      caption,
    } as any);
    if (!error) await fetchFeed();
    return error;
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from("social_likes").delete().match({ user_id: user.id, post_id: postId });
      await supabase.rpc('decrement_post_likes', { post_id_param: postId });
    } else {
      await supabase.from("social_likes").insert({ user_id: user.id, post_id: postId } as any);
      await supabase.rpc('increment_post_likes', { post_id_param: postId });
    }
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked_by_me: !liked,
      likes_count: liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
    } : p));
  };

  const followUser = async (targetId: string) => {
    if (!user) return;
    // Check if target is private
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("is_public")
      .eq("id", targetId)
      .single();

    if (targetProfile && !targetProfile.is_public) {
      const { data: existingRequest } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("requester_id", user.id)
        .eq("target_id", targetId)
        .eq("status", "pending")
        .maybeSingle();

      if (!existingRequest) {
        const { error } = await supabase.from("follow_requests").insert({ requester_id: user.id, target_id: targetId } as any);
        if (error) return "error";
        await supabase.rpc("notify_follow_request", { requester_id: user.id, target_id: targetId });
      }

      return "requested";
    }

    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetId)
      .maybeSingle();

    if (!existingFollow) {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId } as any);
      if (error) return "error";
    }

    setFollowingIds(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
    return "followed";
  };

  const unfollowUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });
    setFollowingIds(prev => prev.filter(id => id !== targetId));
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from("social_posts").delete().eq("id", postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const uploadSocialImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("social-media")
      .upload(path, file, { contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from("social-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const blockUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: targetId } as any);
  };

  const unblockUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from("blocked_users").delete().match({ blocker_id: user.id, blocked_id: targetId });
  };

  const getBlockedIds = async (): Promise<string[]> => {
    if (!user) return [];
    const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
    return (data || []).map((b: any) => b.blocked_id);
  };

  return {
    posts, stories, loading, followingIds,
    createPost, createStory, toggleLike, followUser, unfollowUser,
    deletePost, uploadSocialImage, refreshFeed: fetchFeed,
    blockUser, unblockUser, getBlockedIds,
  };
}
