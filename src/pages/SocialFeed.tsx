import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { useSocial } from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

type Tab = "feed" | "discover";

export default function SocialFeed() {
  const { user } = useAuth();
  const {
    posts, loading, toggleLike, deletePost,
    createPost, uploadSocialImage,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useSocial();
  const [tab, setTab] = useState<Tab>("feed");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.trim().length < 3) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_preset")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(10);
      const filtered = (data || []).filter(u =>
        !(u.display_name?.trim().toLowerCase() === "user" && !u.avatar_url && !u.avatar_preset)
      );
      setSearchResults(filtered);
      setSearching(false);
    }, 300);
  }, []);

  const feedPosts = posts;
  const discoverPosts = useMemo(
    () => posts.filter(p => p.user_id !== user?.id),
    [posts, user?.id]
  );
  const displayPosts = tab === "feed" ? feedPosts : discoverPosts;

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Social</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCreatePost(true)}>
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
            "px-4 py-1.5 rounded-full text-xs font-medium transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            tab === "feed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >Feed</button>
        <button
          onClick={() => setTab("discover")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            tab === "discover" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        ><Compass className="w-3 h-3 inline mr-1" /> Discover</button>
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
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-transform duration-150 text-left"
                >
                  <UserAvatar
                    avatarUrl={u.avatar_url}
                    avatarPreset={u.avatar_preset}
                    displayName={u.display_name}
                    userId={u.id}
                    className="w-9 h-9 flex-shrink-0 bg-muted"
                  />
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

      {/* Posts — always render immediately, data fills in */}
      <div className="space-y-2 mt-2">
        {displayPosts.length === 0 && !loading ? (
            <div className="text-center py-16 px-5">
              <p className="text-sm font-medium text-foreground">
                {tab === "feed" ? "No posts yet" : "Nothing to discover"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "feed" ? "Follow people or share your first outfit!" : "Be the first to post!"}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button onClick={() => setShowCreatePost(true)} className="rounded-2xl bg-accent text-accent-foreground" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Create Post
                </Button>
                {/* Guide users to find people to follow when feed is empty */}
                {tab === "feed" && (
                  <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => navigate("/friends")}>
                    <Compass className="w-4 h-4 mr-1" /> Find people
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {displayPosts.map((post) => (
                <PostCard key={post.id} post={post} onLike={toggleLike} onDelete={deletePost} isOwn={post.user_id === user?.id} />
              ))}
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-1" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
      </div>

      <CreatePostSheet open={showCreatePost} onOpenChange={setShowCreatePost} onSubmit={(urls, caption) => createPost(urls, caption)} uploadImage={uploadSocialImage} type="post" />
    </div>
  );
}
