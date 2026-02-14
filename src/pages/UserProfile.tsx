import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocial, SocialPost } from "@/hooks/useSocial";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Lock, Loader2, Grid3X3, AtSign } from "lucide-react";

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_position: string;
  bio: string | null;
  is_public: boolean;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { followingIds, followUser, unfollowUser, toggleLike, deletePost } = useSocial();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followAction, setFollowAction] = useState<"none" | "loading">("none");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = userId === user?.id;
  const isFollowing = followingIds.includes(userId || "");
  const canView = isOwnProfile || profile?.is_public || isFollowing;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_position, bio, is_public")
        .eq("id", userId)
        .single();
      setProfile(profileData as UserProfile | null);

      // Counts
      const { count: fc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);
      setFollowersCount(fc || 0);

      const { count: fgc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);
      setFollowingCount(fgc || 0);

      // Posts
      const { data: postData } = await supabase
        .from("social_posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (postData && profileData) {
        setPosts(postData.map((p: any) => ({
          ...p,
          user: profileData,
        })));
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  const handleFollow = async () => {
    if (!userId) return;
    setFollowAction("loading");
    if (isFollowing) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
    setFollowAction("none");
    // Refresh count
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);
    setFollowersCount(count || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">User not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </header>

      {/* Profile header */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-card border border-border flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: profile.avatar_position || 'center' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{profile.display_name || profile.username}</h2>
            {profile.username && (
              <p className="text-xs text-accent font-medium flex items-center gap-0.5">
                <AtSign className="w-3 h-3" />{profile.username}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-foreground mt-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-6 mt-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{posts.length}</p>
            <p className="text-[10px] text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{followersCount}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Follow button */}
        {!isOwnProfile && (
          <Button
            onClick={handleFollow}
            disabled={followAction === "loading"}
            variant={isFollowing ? "outline" : "default"}
            className="w-full mt-3 h-9 rounded-xl text-xs font-semibold"
          >
            {followAction === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              "Following"
            ) : (
              "Follow"
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {!canView ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">This account is private</p>
          <p className="text-xs text-muted-foreground mt-1">Follow to see their posts and wardrobe</p>
        </div>
      ) : (
        <>
          {/* Post grid */}
          <div className="px-1">
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border/40">
              <Grid3X3 className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground">Posts</span>
            </div>
            {posts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-12">No posts yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <div key={post.id} className="aspect-square">
                    <img
                      src={post.image_urls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
