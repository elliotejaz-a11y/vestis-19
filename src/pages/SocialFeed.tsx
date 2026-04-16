import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoriesBar } from "@/components/StoriesBar";
import { PostCard } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { useSocial, SocialStory } from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { User, Loader2 } from "lucide-react";

type Tab = "feed" | "discover";

export default function SocialFeed() {
  const { user } = useAuth();
  const { posts, stories, loading, toggleLike, deletePost, createPost, createStory, uploadSocialImage, refreshFeed } = useSocial();
  const [tab, setTab] = useState<Tab>("feed");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<SocialStory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.trim().length < 3) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(10);
      setSearchResults((data || []).filter(u => u.avatar_url && u.username && !/^user\d*$/i.test(u.username)));
      setSearching(false);
    }, 300);
  }, []);

  const feedPosts = posts;
  const discoverPosts = posts.filter(p => p.user_id !== user?.id && p.user?.avatar_url && p.user?.username && !/^user\d*$/i.test(p.user.username));

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Social</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowCreatePost(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 pb-2 flex gap-2">
        <button
          onClick={() => setTab("feed")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
            tab === "feed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          Feed
        </button>
        <button
          onClick={() => setTab("discover")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
            tab === "discover" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          <Compass className="w-3 h-3 inline mr-1" /> Discover
        </button>
      </div>

      {tab === "discover" && (
        <div className="px-5 pb-3">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="rounded-xl bg-card text-sm"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl bg-card border border-border/40 overflow-hidden">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/user/${u.id}`)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{u.display_name || u.username}</p>
                    {u.username && <p className="text-[10px] text-muted-foreground">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stories */}
      <StoriesBar
        stories={stories}
        onAdd={() => setShowCreateStory(true)}
        onView={setViewingStory}
      />

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {(tab === "feed" ? feedPosts : discoverPosts).length === 0 ? (
            <div className="text-center py-16 px-5">
              <p className="text-sm font-medium text-foreground">
                {tab === "feed" ? "No posts yet" : "Nothing to discover"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "feed"
                  ? "Follow people or share your first outfit!"
                  : "Be the first to post!"}
              </p>
              <Button
                onClick={() => setShowCreatePost(true)}
                className="mt-4 rounded-2xl bg-accent text-accent-foreground"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" /> Create Post
              </Button>
            </div>
          ) : (
            (tab === "feed" ? feedPosts : discoverPosts).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onDelete={deletePost}
                isOwn={post.user_id === user?.id}
              />
            ))
          )}
        </div>
      )}

      {/* Story viewer */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col"
          onClick={() => setViewingStory(null)}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
              {viewingStory.user?.avatar_url ? (
                <img src={viewingStory.user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {viewingStory.user?.username || viewingStory.user?.display_name}
            </span>
            <button className="ml-auto text-xs text-muted-foreground" onClick={() => setViewingStory(null)}>
              ✕
            </button>
          </div>
          <div className="flex-1 relative">
            <img
              src={viewingStory.image_url}
              alt=""
              className="w-full h-full object-contain"
            />
            {viewingStory.caption && (
              <div className="absolute bottom-8 left-4 right-4 bg-background/70 backdrop-blur rounded-xl p-3">
                <p className="text-sm text-foreground">{viewingStory.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create sheets */}
      <CreatePostSheet
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onSubmit={(urls, caption) => createPost(urls, caption)}
        uploadImage={uploadSocialImage}
        type="post"
      />
      <CreatePostSheet
        open={showCreateStory}
        onOpenChange={setShowCreateStory}
        onSubmit={(urls, caption) => createStory(urls[0], caption)}
        uploadImage={uploadSocialImage}
        type="story"
      />
    </div>
  );
}
