import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface StorySlide {
  id: string;
  story_id: string;
  slide_order: number;
  media_url: string | null;
  media_type: "image" | "video" | null;
  duration: number;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  is_active: boolean;
  slides: StorySlide[];
}

export function useStories() {
  const { user } = useAuth();
  const [ownStories, setOwnStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOwnStories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: storiesData } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (!storiesData?.length) {
        setOwnStories([]);
        return;
      }

      const storyIds = storiesData.map((s) => s.id);
      const { data: slidesData } = await supabase
        .from("story_slides")
        .select("*")
        .in("story_id", storyIds)
        .order("slide_order", { ascending: true });

      const slides = (slidesData ?? []) as StorySlide[];
      const stories: Story[] = storiesData.map((s) => ({
        ...s,
        media_type: s.media_type as "image" | "video" | null,
        slides: slides.filter((sl) => sl.story_id === s.id),
      }));

      setOwnStories(stories);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOwnStories();
  }, [fetchOwnStories]);

  const uploadStoryMedia = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `stories/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("story-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }, [user]);

  const getSlideUrl = useCallback(async (path: string | null): Promise<string | null> => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = await supabase.storage
      .from("story-media")
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }, []);

  const createStory = useCallback(async (file: File): Promise<void> => {
    if (!user) return;
    const mediaPath = await uploadStoryMedia(file);
    if (!mediaPath) throw new Error("Upload failed");

    const isVideo = file.type.startsWith("video/");
    const mediaType = isVideo ? "video" : "image";

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (storyError) throw storyError;

    const { error: slideError } = await supabase.from("story_slides").insert({
      story_id: story.id,
      slide_order: 0,
      media_url: mediaPath,
      media_type: mediaType,
      duration: isVideo ? 15 : 5,
    });
    if (slideError) throw slideError;

    await fetchOwnStories();
  }, [user, uploadStoryMedia, fetchOwnStories]);

  const recordView = useCallback(async (storyId: string) => {
    if (!user) return;
    await supabase.rpc("record_story_view", {
      p_story_id: storyId,
      p_viewer_id: user.id,
    });
  }, [user]);

  const hasActiveStories = ownStories.length > 0;

  return {
    ownStories,
    hasActiveStories,
    loading,
    createStory,
    getSlideUrl,
    recordView,
    refresh: fetchOwnStories,
  };
}
