import { useCallback } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSignedSocialUrl, batchGetSignedSocialUrls, batchResolveAvatarUrls } from "@/lib/storage";

export interface SocialPost {
  id: string;
  user_id: string;
  caption: string;
  image_urls: string[];
  outfit_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null; avatar_preset: string | null };
  liked_by_me?: boolean;
}

export interface SocialStory {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  expires_at: string;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null; avatar_preset: string | null };
}

export interface SocialComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user?: { display_name: string | null; username: string | null; avatar_url: string | null; avatar_preset: string | null };
}

const PAGE_SIZE = 15;

async function enrichPostsWithProfiles(postData: any[], userId: string) {
  const userIds = [...new Set(postData.map((p: any) => p.user_id))];
  const [profilesResult, myLikesResult] = await Promise.allSettled([
    supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_preset").in("id", userIds),
    supabase.from("social_likes").select("post_id").eq("user_id", userId),
  ]);
  const rawProfiles = profilesResult.status === "fulfilled" ? profilesResult.value.data || [] : [];
  const myLikes = myLikesResult.status === "fulfilled" ? myLikesResult.value.data : null;
  const likedPostIds = new Set((myLikes || []).map((l: any) => l.post_id));
  const signedAvatars = await batchResolveAvatarUrls(rawProfiles.map((p: any) => p.avatar_url));
  const profileMap = new Map(rawProfiles.map((p: any, i: number) => [p.id, { ...p, avatar_url: signedAvatars[i] ?? p.avatar_url }]));
  // Batch-sign all image URLs across all posts in a single storage request
  const allImageUrls = postData.flatMap((p: any) => p.image_urls || []);
  const signedFlat = await batchGetSignedSocialUrls(allImageUrls);

  let urlOffset = 0;
  const enriched = postData.map((p: any) => {
    const count = (p.image_urls || []).length;
    const image_urls = signedFlat.slice(urlOffset, urlOffset + count).filter(Boolean) as string[];
    urlOffset += count;
    return {
      ...p,
      image_urls,
      user: profileMap.get(p.user_id),
      liked_by_me: likedPostIds.has(p.id),
    };
  });
  return enriched;
}

export function useSocial() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Following IDs
  const { data: followingIds = [] } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      return (data || []).map((f: any) => f.following_id);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Infinite scroll posts
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
  } = useInfiniteQuery({
    queryKey: ["social-posts", user?.id],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!user) return { posts: [], nextCursor: null };
      let query = supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt("created_at", pageParam);
      }

      const { data: postData } = await query;
      if (!postData || postData.length === 0) return { posts: [], nextCursor: null };

      const enriched = await enrichPostsWithProfiles(postData, user.id);
      const nextCursor = postData.length === PAGE_SIZE ? postData[postData.length - 1].created_at : null;
      return { posts: enriched as SocialPost[], nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });

  const posts = postsData?.pages.flatMap((p) => p.posts) ?? [];

  // Stories
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ["social-stories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: storyData } = await supabase
        .from("social_stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (!storyData) return [];
      const userIds = [...new Set(storyData.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_preset").in("id", userIds);
      const rawProfilesForStories = profiles || [];
      const signedStoryAvatars = await batchResolveAvatarUrls(rawProfilesForStories.map((p: any) => p.avatar_url));
      const profileMap = new Map(rawProfilesForStories.map((p: any, i: number) => [p.id, { ...p, avatar_url: signedStoryAvatars[i] ?? p.avatar_url }]));
      const signedStoryUrls = await batchGetSignedSocialUrls(storyData.map((s: any) => s.image_url));
      const enriched = storyData.map((s: any, i: number) => ({
        ...s,
        image_url: signedStoryUrls[i] || s.image_url,
        user: profileMap.get(s.user_id),
      }));
      return enriched as SocialStory[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const loading = postsLoading && storiesLoading;

  // Optimistic like toggle
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) return;
      if (liked) {
        await supabase.from("social_likes").delete().match({ user_id: user.id, post_id: postId });
        await supabase.rpc("decrement_post_likes", { post_id_param: postId });
      } else {
        await supabase.from("social_likes").insert({ user_id: user.id, post_id: postId } as any);
        await supabase.rpc("increment_post_likes", { post_id_param: postId });
      }
    },
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["social-posts"] });
      const prev = queryClient.getQueryData(["social-posts", user?.id]);
      queryClient.setQueryData(["social-posts", user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) =>
              p.id === postId
                ? { ...p, liked_by_me: !liked, likes_count: liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
                : p
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["social-posts", user?.id], context.prev);
    },
  });

  const toggleLike = useCallback((postId: string, liked: boolean) => {
    toggleLikeMutation.mutate({ postId, liked });
  }, [toggleLikeMutation]);

  // Create post
  const createPost = async (imageUrls: string[], caption: string, outfitId?: string) => {
    if (!user) return;
    const { error } = await supabase.from("social_posts").insert({
      user_id: user.id, image_urls: imageUrls, caption, outfit_id: outfitId || null,
    } as any);
    if (!error) queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    return error;
  };

  const createStory = async (imageUrl: string, caption: string) => {
    if (!user) return;
    const { error } = await supabase.from("social_stories").insert({
      user_id: user.id, image_url: imageUrl, caption,
    } as any);
    if (!error) queryClient.invalidateQueries({ queryKey: ["social-stories"] });
    return error;
  };

  // Optimistic delete with rollback — if the delete fails, restore the post
  const deletePost = useCallback(async (postId: string) => {
    if (!user) return;
    const snapshot = queryClient.getQueryData(["social-posts", user.id]);
    queryClient.setQueryData(["social-posts", user.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.filter((p: SocialPost) => p.id !== postId),
        })),
      };
    });
    const { error } = await supabase.from("social_posts").delete().eq("id", postId);
    if (error) {
      // Restore the previous state so the post reappears
      queryClient.setQueryData(["social-posts", user.id], snapshot);
    }
  }, [user, queryClient]);

  const followUser = async (targetId: string) => {
    if (!user) return;
    const { data: targetProfile } = await supabase.from("profiles").select("is_public").eq("id", targetId).single();
    if (targetProfile && !targetProfile.is_public) {
      await supabase.from("follow_requests").insert({ requester_id: user.id, target_id: targetId } as any);
      return "requested";
    }
    await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId } as any);
    queryClient.invalidateQueries({ queryKey: ["following"] });
    return "followed";
  };

  const unfollowUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });
    queryClient.invalidateQueries({ queryKey: ["following"] });
  };

  const uploadSocialImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    // Upload to private "social-content" bucket. Reads are gated by storage RLS
    // tied to the related social_posts / social_stories row visibility.
    const { error } = await supabase.storage.from("social-content").upload(path, file, { contentType: file.type });
    if (error) return null;
    // Store the canonical (non-public) object URL so consumers can resolve a signed URL at render.
    const { data } = supabase.storage.from("social-content").getPublicUrl(path);
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

  const refreshFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    queryClient.invalidateQueries({ queryKey: ["social-stories"] });
  }, [queryClient]);

  return {
    posts, stories, loading, followingIds,
    createPost, createStory, toggleLike, followUser, unfollowUser,
    deletePost, uploadSocialImage, refreshFeed,
    blockUser, unblockUser, getBlockedIds,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  };
}
